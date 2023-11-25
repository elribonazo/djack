import Document, { Html, Head, Main, NextScript } from "next/document";

import { AppConfig } from "../utils/AppConfig";

// Need to create a custom _document because i18n support is not compatible with `next export`.
class MyDocument extends Document {
  render() {
    return (
      <Html lang={AppConfig.locale}>
        <Head />
        <body
          style={{
            backgroundImage: "url('/assets/images/header.png')",
            backgroundColor: "#121312",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        >
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
