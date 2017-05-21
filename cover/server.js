var PORT = 33333;
var HOST = '127.0.0.1';
var protobuf = require("protobufjs");
var dgram = require('dgram');
var server = dgram.createSocket('udp4');

protobuf.load("cover.helloworld.proto", function(err, root) {
    if (err)
        throw err;

    // Obtain a message type
    var Cover = root.lookupType("cover.helloworld");
    var HelloCoverReq = Cover.nested.helloCoverReq;
    var HelloCoverRsp = Cover.nested.helloCoverRsp;

    server.on('listening', function () {
        var address = server.address();
        console.log('UDP Server listening on ' + address.address + ":" + address.port);
    });

    server.on('message', function (message, remote) {
        console.log(remote.address + ':' + remote.port +' - ' + message);
        console.log(HelloCoverReq.decode(message) + 'from client!');
        var coverRspObj = {
            retcode: 0,
            reply: 'Yeah!I\'m handsome cover!'
        };
        var errMsg = HelloCoverRsp.verify(coverRspObj);
        if (errMsg) {
            throw Error(errMsg);
        }
        var message = HelloCoverRsp.create(coverRspObj);
        var buffer = HelloCoverRsp.encode(message).finish();

        var message = buffer;

        server.send(message, 0, message.length, remote.port, remote.address, function(err, bytes) {
            if(err) {
                throw err;
            }

            console.log('UDP message reply to ' + remote.address +':'+ remote.port);
        })

    });
    server.bind(PORT, HOST);
});
