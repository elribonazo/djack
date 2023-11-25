/* eslint-disable react/no-unescaped-entities */

import { Meta } from "../layout/Meta";
import { Main } from "../templates/Main";

const Index = () => {
  return (
    <Main
      meta={
        <Meta
          title="DJACK"
          description="Empowering Your Email Experience on Cardano's Decentralized Network Unveiling DJack, the pioneering serverless email service built exclusively for Cardano."
        />
      }
    >
      <h1 className="font-bold text-3xl">Introduction</h1>
      <p>
        Empowering Your Email Experience on Cardano's Decentralized Network
        Unveiling DJack, the pioneering serverless email service built
        exclusively for Cardano's innovative blockchain ecosystem. Elevate your
        communication game with a plethora of cutting-edge features designed to
        provide you with unparalleled privacy, security, and convenience.
        <br />
        <br />
        <a
          href={"/app"}
          className="inline-flex items-center mt-0 my-2 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:outline-none focus:ring-gray-200 focus:text-blue-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-700"
        >
          Try now
        </a>
      </p>
      <h2 className="font-bold text-1xl">🔒 Unmatched Privacy</h2>
      <p>
        DJack redefines the way you approach email communication. Craft
        disposable email accounts effortlessly, fortified by security of
        Cardano's blockchain. Rest assured that only you hold the keys to access
        these account credentials, safeguarding your sensitive correspondence
        from prying eyes or unwanted access.
      </p>
      <h2 className="font-bold text-1xl">💼 Seamless Credentials</h2>
      <p>
        Bid farewell to the complexities of buying NFTs or investing in
        extraneous assets. With DJack, simplicity is key. Establish your account
        effortlessly, securely storing your credentials for instantaneous access
        whenever the need arises.
      </p>
      <h2 className="font-bold text-1xl">⚙️ Robust Simplicity</h2>
      <p>
        DJack harmonizes advanced technology with user-friendly simplicity.
        Enjoy the power of serverless architecture without grappling with
        technical intricacies. Our service seamlessly integrates with your
        workflow, allowing you to focus on communication, not configuration.
      </p>
      <h2 className="font-bold text-1xl">🌐 Empowering Blockchain</h2>
      <p>
        DJack signifies the immense potential of decentralized applications. By
        leveraging the robust capabilities of Cardano, we've sculpted an email
        service that mirrors the ethos of the blockchain - trustless, secure,
        and transparent.
      </p>

      <h2 className="font-bold text-1xl">🌟 Features Beyond Compare</h2>
      <p>
        DJack isn't just an email service; it's a game-changer. Experience
        features designed to transcend traditional emailing. From ephemeral
        accounts to self-sovereign identity integration, every facet of DJack is
        meticulously engineered to amaze. Join the revolution. Embrace the
        future. Elevate your emailing experience with DJack on Cardano - where
        innovation meets integrity. Your journey towards secure and seamless
        email authentication starts here.
      </p>
    </Main>
  );
};

export default Index;
