import { useEffect, useState } from "react";
import { GC_SCRIPT, create } from "../utils/gc";

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
        <img
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
    <a href={url} className="mt-4">
      <img
        src="/gc.png"
        width={120}
        height={34}
        alt="QR Code"
        className="rounded-lg mb-1"
      />
    </a>
  );
};

export default GCButton;
