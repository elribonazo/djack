// import { SMTPServer, SMTPServerOptions } from 'smtp-server';
//  // server.listen(mailPort)
//         // const options : SMTPServerOptions = {
//         //     secure: true,
//         //     onAuth (auth, session, callback) {
//         //         return callback(null, { user: 123 });
//         //     },
//         //     onConnect(session, callback) {
//         //         return callback();
//         //     },
//         //     onClose(session) {
//         //     },
//         //     onMailFrom(address, session, callback) {
//         //         return callback() //Accept address
//         //     },
//         //     onRcptTo(address, session, callback) {
//         //         return callback() //Accept address
//         //     },
//         //     onData(stream, session, callback) {
//         //         return callback() //once mail is read
//         //     }
//         // }
//         // const server = new SMTPServer(options)
//         // server.on("error", (err) => {
//         //     console.log("Error %s", err.message);
//         // })