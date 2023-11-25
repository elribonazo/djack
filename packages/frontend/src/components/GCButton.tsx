import { useEffect, useState } from "react";
import Image from "next/image";
import { GC_SCRIPT, create } from "../utils/gc";
import Link from "next/link";

type GCButtonProps = {
  script: GC_SCRIPT;
  onClick?: () => Promise<void> | void;
};

const GCButton: React.FC<GCButtonProps> = (props) => {
  const { script } = props;
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!url) {
      create(script).then((gcUrl) => {
        setUrl(gcUrl);
      });
    }
  }, [script, url]);

  if (!url) {
    return null;
  }

  if (props.onClick) {
    return (
      <button onClick={props.onClick} className="mt-4">
        <Image
          src="/gc.png"
          width={120}
          height={34}
          alt="QR Code"
          className="rounded-lg mb-1"
        />
      </button>
    );
  }

  return (
    <Link href={url} className="mt-4">
      <Image
        src="/gc.png"
        width={120}
        height={34}
        alt="QR Code"
        className="rounded-lg mb-1"
      />
    </Link>
  );
};

export default GCButton;
