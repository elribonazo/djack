/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { registry } from "./registry";
import { fileURLToPath } from "url";

import fs from "fs";
import path from "path";

import { Server } from "./server/index.js";
import { inMemory } from "@djack-sdk/shared";
import { Network } from "@djack-sdk/network";

import {
  Ed25519PrivateKey,
  Ed25519PublicKey,
  PeerDID,
  createX25519FromEd25519KeyPair,
} from "@djack-sdk/did-peer";

import { multiaddr } from "@multiformats/multiaddr";
import { peerIdFromString } from "@libp2p/peer-id";
import { getResolver } from 'web-did-resolver';
import { DIDDocument, Resolver } from "did-resolver";

(async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  if (!process.env.SSL_CERT_PATH ||
    !process.env.SSL_KEY_PATH) {
    throw new Error("Please specify valid crt (SSL_CERT_PATH) and key (SSL_KEY_PATH) ssl certificate env variables.")
  }
  if (
    !process.env.HOST_PK ||
    !process.env.HOST_PU) {
    throw new Error("Please provide host ed25519keypair using HOST_PK and HOST_PU both as raw hex")
  }

  if (!process.env.HOST_RELAYS) {
    throw new Error("Please provide a list of relay didweb in HOST_RELAYS split by comma.")
  }

  const relays = process.env.HOST_RELAYS.split(",").map((value) => value.trim())

  if (relays.length <= 0) {
    throw new Error("No HOST_RELAYS have been provided, the user will not be able to communicate outside.")
  }

  const cert = fs.readFileSync(process.env.SSL_CERT_PATH);
  const key = fs.readFileSync(process.env.SSL_KEY_PATH);
  const mailPort = 587;

  const didResolver = new Resolver(await getResolver());
  const resolvedRelays = await relays.map(async (didWeb) => {

    const resolved = await didResolver.resolve(didWeb);
    if (resolved && resolved.didDocument) {
      const requiredService = resolved.didDocument.service?.find((service: any) => service.type === "DIDCommMessaging" && service.serviceEndpoint.accept.includes("didcomm/v2"));
      if (!requiredService) {
        throw new Error(`Invalid did:web (${didWeb}), does not accept didcomm/v2 DIDCommMessaging required service.`)
      }
      const serviceEndpoint = requiredService.serviceEndpoint;
      if (Array.isArray(serviceEndpoint)) {
        throw new Error(`Invalid did:web (${didWeb}), has an invalid serviceEndpoint.`)
      }

      if (typeof serviceEndpoint === "string") {
        throw new Error(`Invalid did:web (${didWeb}), has an invalid serviceEndpoint.`)
      }

      const relayPeerDID = serviceEndpoint.uri;
      const relayResolvedPeerDID = await PeerDID.resolve(relayPeerDID);

      const requiredpeerIdService = relayResolvedPeerDID.service.find((service) => service.type === "DIDCommMessaging" && service.serviceEndpoint.accept.includes("didcomm/v2"))?.serviceEndpoint.uri as string;
      if (!requiredpeerIdService) {
        throw new Error(`Invalid did:web (${didWeb}), does not accept didcomm/v2 DIDCommMessaging required service.`)
      }
    }

    throw new Error(`Could not resolve did:web (${didWeb})`)
  })


  const ed25519KeyPair = {
    private: new Ed25519PrivateKey(
      Buffer.from(
        process.env.HOST_PK,
        "hex"
      )
    ),
    public: new Ed25519PublicKey(
      Buffer.from(
        process.env.HOST_PU,
        "hex"
      )
    ),
  };

  const barcelonaKeyPair = {
    private: new Ed25519PrivateKey(
      Buffer.from(
        process.env.BARCELONA_PK,
        "hex"
      )
    ),
    public: new Ed25519PublicKey(
      Buffer.from(
        process.env.BARCELONA_PU,
        "hex"
      )
    ),
  };

  const x25519BarcelonaKeyPair = createX25519FromEd25519KeyPair(barcelonaKeyPair);

  const barcelonaPeerId = peerIdFromString(
    process.env.BARCELONA_PEER
  );

  const barcelonaPeerDID = new PeerDID(
    [barcelonaKeyPair, x25519BarcelonaKeyPair].map((keyPair) => keyPair.public),
    [
      {
        id: "didcomm",
        type: "DIDCommMessaging",
        serviceEndpoint: {
          uri: barcelonaPeerId.toString(),
          accept: ["didcomm/v2"],
        },
      },
    ]
  );


  inMemory.addDIDKey(
    barcelonaPeerDID,
    barcelonaPeerId,
    barcelonaKeyPair.private
  );

  inMemory.addDIDKey(
    barcelonaPeerDID,
    barcelonaPeerId,
    x25519BarcelonaKeyPair.private
  );

  const server = await Server.create({
    key,
    cert,
    domain: "djack.email",
    mail: {
      secure: false,
      port: mailPort,
    },
    storage: inMemory,
    p2p: {
      relays: Network.addDefaultListeners([]),
      keyPair: ed25519KeyPair,
    },
  });

  await server.start();


  await server.network.dial(
    multiaddr(
      process.env.RELAY_ADDRESS
    )
  );

  server.network.p2p.addEventListener("self:peer:update", (evt) => {
    const addresses = server.network.p2p.getMultiaddrs();
    addresses.forEach((address) => {
      console.log(`Advertising with a relay address of ${address.toString()}`);
    });
  });

  const issuerDID = server.cardanoDID!.toString();
  const credentialSchemaId = `${issuerDID}/schemas/djack`;
  const credentialDefinitionId = `${issuerDID}/definitions/djack`;

  const credentialSchemaJson = {
    name: "credential schema name",
    version: "1.0",
    attrNames: ["did", "email"],
    issuerId: issuerDID,
  };

  const emailCredentialDefinitionJson = {
    credentialDefinition: {
      schemaId: `${issuerDID}/schemas/djack`,
      type: "CL",
      tag: "djack",
      value: {
        primary: {
          n: "88940932234087087757143981328675072597975050564218126594804903164894055112399711888580305809086655740685972309100599911298723094622027773422946799624325571458930641204924786420873242977881297776026945013936883237801612951132495917567932922194669967712377389230500351493056664892162612089809902007808246365625084362694892984055347609106549052528960111823445671293035459161769810238265155944257996626229687898574056430846993485079556843335910270172358269619155425084398468568602967654020555458691242754370337659022824382022663967578441256805233105548218902775937955644128755193952825083391236006443539571920020228081033",
          s: "37119140301527379100133219699352271585418469553733445507684827888907926017596082453234083975821783756306735488964253370221548436615425303599416011352769232374144218626261526200191873360847854236026409869991268034403164266640736311370407423935004543725063952521762258089743860030391697572665324751639873898663413750640489874733803955970378517818759482352119315651050045976145484143956353093007378688232518746388861282114033459894949029439300100262829973506397462904709590376980590211153428761867403301393404769365947002387399975598780190166333329921408270126876050951756538669452335496857347858981977532514931982199351",
          r: {
            email:
              "85070515575003738183231184365379673358269496269578776920451741272269567884999740168590132164238237080938289559200888788521045370860797932447891563167329864247456722412877535148685920916352685304026434379983573475339407047929395347927163451278980903259055940927035768600340797273467023060277854855377044489112621449976507133726653733231022552138546409288818269415754878438805015578574569049882560815895059446633292944508346358089379903309732630526652485101518175663319534075255645424420890539352790774633290190320449870972737679529664517182301987446824598900204229656893795940392585734739101893543046075033503926016191",
            did: "44263726918408553653307192488370729411297107146980276326612879195739023305049202197796830048651873862235572855411454604008522306464964504227104343965834457100087911508094077812686363616504108209125330209412807339430389020204981239257912992475139385437837874671971774673774863402649116578425332297638228607281233873614030212090192905845487132863441257792773137346122117451227064379530735084701400889583117032563062073088661558038919618489037334774660799792178747734505694875844345115630264349943642592970991607380236523723949348608586574799001685374189189925518362936427728470934777408800607485968800965467249508389561",
            master_secret:
              "79313696588994463342062241073274067747277610271883857691961133538028609467751093218121401039249014687392257537401669153347650152335299286375302408617436111656422521419748661571954047324667084621054206046595104806337760589597979116385091945752917329183493801814277760135782644752321647702270556660253362752923988650183074187954442772093689627333727262052978036563034047736330872362698367536306909706208289373986297032091396586037528366863368300463226157715899317568381925915835423262735061680522284895588087554972043972060534739680578780562920031602417193800942639646054987296156971792472600477127531922726186069560282",
          },
          rctxt:
            "14487450717898932054312030445746136054486361264091192392226720577642149152784311797937995691098010740728418032450939475413766673751615180318037071476796087627331306088324854946241784722239497227315425039779121533001593592318790906288625780997417152720989794873292485519090190084687389612884096631454288073663771560569225498320782923255152650190487853087154589553201423215449016199781708456927068784618077919575026463118781762097140393435774576131112989025426463057575366196501278021356008664878217348752531894514594032838570737239510085879928713888583363483214607587531529155083946022685045132082267394995892190621112",
          z: "12316939860082308496372409277890516220014799507217485262525709876351504303760543450264285638934830875126723640226537120976557807771222101017704470517801167876209998534761977360581935182974168938235144891327244812179633881990089372481516550732407985559831219180475215985400501037085170964304139389943184965138725707778902224810801013128535965889888232760209495821597768198018782842328361468292492687301157991885061096638523808912457915434293141658625761350588046136783908103510657009991100122977052251169847993466763062464270304431753898934814519553042581544951239739562539086152716682013373837636971241570667679287483",
        },
      },
      issuerId: issuerDID,
    },
    credentialDefinitionPrivate: {
      value: {
        p_key: {
          p: "152092534126140071137924584570047061963658519261697793173224898213266092268752770336543241708478331723079753368267271127115459063357956865605368800407859948834402585895701268891469915047958237494742257909432469395091902366974745602575089719118190674503187415171917743113629599696800082579222787896717904684719",
          q: "146195427581479248048552475843961032579273538757378393589018501441709114620772424401522117040242699511177027566797821465763161228944349257351821434622344225864122533723648396512283234953527459158702316489563209724641078671513077581594123919738683098405852511745273998266847607275456160315863526068288166893323",
        },
        r_key: null,
      },
    },
    keyCorrectnessProof: {
      c: "84366563368462726104595456550452186691820234798517042777928733768312315782943",
      xz_cap:
        "1644184481450499635767123110663600620548482556042753571914371079413323183922353973226017873922496581760080947444158391778377371137810898374343669592485937343792953501598267157300759148271816397261436148457846377371026062361412133998976130174045756943187095697377918671741349052395980049323650414581056280225915306262467774309764628592027829817613524843909770056032357874592317525650575846714999273936922647741410263153805762696395712860336815451535190670581270107399549229986552692711742971810946592667113420947210871975485269741581533595030120380895476471685496125862927734267273700143816090810878626074117166194127833272662411313086747022876428893626385284492909849399121665563903715734301952",
      xr_cap: [
        [
          "master_secret",
          "174653196461349713072602139287638504518113465027219910801281521832479893018367102723140198582373529117283303864529970335142772520006973308441754320462609898293970067628646872724514572487708848036446144708395911428225061211211193444818582972495894339228804659394293735672623897437239378232074108985406461622145384931881636603853647378936314953602095857241381347488511837731021769969481733595069708640389706638640661538380672224726219851906893084503171083317333207600976672460785492998815522584721001799286688002278293173360417470421125399347141944761737963563275298167459881787277654416851582540059465706075562762412669139622091135273193788872502421300812965017851553680839822672486350976730220",
        ],
        [
          "email",
          "763105694772847410025325921852202487479999609876563979616838191194033866044665969157719560593483464901258286788635425346352710395936213434654338979951703281764895320635167730904281296624725152497991031909064450524438541268011557618449651537090779168477623507021972760404625768333771574299680094933953514022635138577479951480981677134179669359378635140098033910570915919434140816610735944690298190737200318399874432108312370998178661534837651468744803389331364371189332384149361428090705110178523604188853496460974743221713628041535714977297799467254540294010032427056372181006253395415441843348567327164012580554016971653465789857063702900931778710594388458472546384839030565365371372497994657",
        ],
        [
          "did",
          "1581034899361623619227561607727629415761784946262142943068574224722897973471844657053390119648321449745146013974155679519832167163818493506297708945250682435150602743790115124340727855289313011365861702145398008350699846675987698715613222326389440464115390488359871550879914525708565493794085885072239329235831013753970852416981541879412819803730996473225716891620221385778718996508579530908595691939673083519112991491529283005315513514262962342575466553126791202817621302463480668533813284939775946020443828809959957177829638345402792556736859290649544686416184401618007186932366900208149261367218127642559079396500492693591572642074563734630242336042292837863597690049624266522094218486969600",
        ],
      ],
    },
  };

  await registry.addCredentialSchema(credentialSchemaId, credentialSchemaJson);
  await registry.addCredentialDefinition(
    credentialDefinitionId,
    emailCredentialDefinitionJson
  );

  if (process.env.NODE_ENV && process.env.NODE_ENV === "development") {
    const [address] = server.network.addresses;
    const template = `NEXT_PUBLIC_DIDWEB_HOSTNAME=localhost
  NEXT_PUBLIC_DIDWEB_HOST=localhost
  NEXT_PUBLIC_RELAY=${address}
  NEXT_PUBLIC_DOMAIN=http://localhost:3000`;
    fs.writeFileSync(
      path.join(__dirname, "../../frontend/.env.development"),
      template
    );
  }
})();
