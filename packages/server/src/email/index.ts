import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export const DEFAULT_PORT = 587;
export const DEFAULT_HOSTNAME = "localhost";

export type Mail = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export type EmailConstructorProps = {
  serverName: string;
  rejectUnauthorized?: boolean;
  hostname?: string;
  port?: number;
  auth?: {
    user: string;
    pass: string;
  };
};

class BaseEmail {
  private transport: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor(content: EmailConstructorProps) {
    const authentication = content.auth && {
      auth: content.auth,
    };
    this.transport = nodemailer.createTransport({
      tls: {
        servername: content.serverName,
        rejectUnauthorized: false,
      },
      host: content.hostname || DEFAULT_HOSTNAME,
      port: content.port || DEFAULT_PORT,
      ...authentication,
    });
  }

  async send(message: Mail) {
    return new Promise((resolve, reject) => {
      this.transport.sendMail(message, (err, info) => {
        if (err) {
          return reject(err);
        } else {
          return resolve(info);
        }
      });
    });
  }
}

const Email: {
  new (content: EmailConstructorProps): BaseEmail;
} = BaseEmail;

export default Email;
