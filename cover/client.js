var dgram = require('dgram');
var protobuf = require("protobufjs");
var PORT = 33333;
var HOST = '127.0.0.1';

protobuf.load("cover.helloworld.proto", function(err, root) {
    if (err) {
        throw err;
    }
    /**
     * 获取消息类型
     * HelloCoverReq：构造请求实例
     * HelloCoverRsp：构造响应实例
     */
    var Cover = root.lookupType("cover.helloworld");
    var HelloCoverReq = Cover.nested.helloCoverReq;
    var HelloCoverRsp = Cover.nested.helloCoverRsp;

    var coverReqObj = {name: 'R U coverguo?'};
    var errMsg = HelloCoverReq.verify(coverReqObj);
    if (errMsg) {
        throw Error(errMsg);
    }
    var message = HelloCoverReq.create(coverReqObj);
    var buffer = HelloCoverReq.encode(message).finish();

    var socket = dgram.createSocket({
        type: 'udp4',
        fd: 8080
    }, function(err, message) {
        if(err) {
            console.log(err);
        }

        console.log(message);
    });

    var message = buffer;

    socket.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
        if(err) {
            throw err;
        }

        console.log('UDP message sent to ' + HOST +':'+ PORT);
    });

    socket.on("message", function (msg, rinfo) {
        console.log("[UDP-CLIENT] Received message: " + HelloCoverRsp.decode(msg).reply + " from " + rinfo.address + ":" + rinfo.port);
        console.log(HelloCoverRsp.decode(msg));

        socket.close();

        //udpSocket = null;
    });

    socket.on('close', function(){
        console.log('socket closed.');


    });

    socket.on('error', function(err){
        socket.close();

        console.log('socket err');
        console.log(err);
    });
});