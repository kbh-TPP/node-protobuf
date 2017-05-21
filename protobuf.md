### Nodejs使用Protocol Buffer

#### 一、Protocol Buffer概述

Protocol Buffer（以下简称protobuf）是Google提供的一种数据序列化协议，Google官方对protobuf的定义：

> Protocol Buffers是一种轻便高效的结构化数据存储格式，可以用于结构化数据序列化，很适合做数据存储或RPC数据交换格式。它可用于通信协议、数据存储等领域的语言无关、平台无关、可扩展的序列化结构数据格式。

* 二进制协议对于电脑来说更容易解析，在解析速度上是http这样的文本协议不可比拟；
* 有tcp和udp两种选择，在一些场景下，udp传输的效率会更高；
* 在后台开发中，后台与后台的通信一般就是基于二进制协议的。甚至某些native app和服务器的通信业选择了二进制协议。但由于web前端的存在，后台同学往往需要特地开发维护一套http接口前端使用，如果web也能使用二进制协议，可以节省许多后台开发成本。

#### 二、NodeJS开发者与Protocol Buffer关系

由于protobuf协议相较于之前流行的XML更加简洁高效，因此许多后台接口都是基于protobuf定制的数据序列化协议。而作为NodeJS开发者，跟C++、Java等传统后台服务接口家常便饭，因此我们很有必要掌握protobuf协议。

在大公司，最重要的就是优化效率、节省成本，因此二进制协议明显优于http这样的文本协议。

#### 三、在NodeJS中实践Protocol Buffer协议

* (protobuf.js)[https://github.com/dcodeIO/ProtoBuf.js]

* (Google protobuf.js)[https://github.com/google/protobuf/tree/master/js]

* (protocol-buffers)[https://github.com/mafintosh/protocol-buffers]

根据star数和文档完善程度两方面，决定选择protobuf.js作为案例分析

#### 四、protobuf.js例子

1. 编写.proto协议文件，一个比较好的习惯是认真对待proto文件的文件名。命名规则：packageName.MessageName.proto，如下命名：cover.helloworld.proto

```
package cover; // package声明符，用来防止不同的消息类型有命名冲突
syntax = "proto3"; // 指明proto文件的protobuf协议版本，不指明则是v2

// 定义一个消息类型
message helloworld {

    message helloCoverReq {
        required string name = 1; // required表示该值是必须要设置
    }

    message helloCoverRsp {
        required int32 retcode = 1;
        optional string reply = 2; // 该字段可以有0个或1个值（不超过1个）
    }
}
```

注：一般情况下，使用Protobuf的人们都会先写好.proto文件，再用Protobuf编译器生成目标语言所需要的源代码文件。将这些生成的代码和应用程序一起编译。可是在某些情况下，人们无法预先知道.proto文件，他们需要动态处理一些未知的.proto文件。比如一个通用的消息转发中间件，它不可能预知需要处理怎样的消息。这需要动态编译.proto文件，并使用其中的Message。

2、.proto文件编译方式

动态编译：采用Protobuf.load，示例如下：

```
protobuf.load("cover.helloworld.proto", function(err, root) {
...
});
```

静态编译： pbjs -t static-module -w commonjs -o cover.helloworld.js cover.helloworld.proto

3. 以动态编译搭建client端服务与server端服务

client.js如下：

```
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
```

执行node client.js执行结果：

```
UDP message sent to 127.0.0.1:33333
<Buffer 08 00 12 18 59 65 61 68 21 49 27 6d 20 68 61 6e 64 73 6f 6d 65 20 63 6f 76 65 72 21>
{ address: '127.0.0.1', family: 'IPv4', port: 33333, size: 28 }
[UDP-CLIENT] Received message: Yeah!I'm handsome cover! from 127.0.0.1:33333
helloCoverRsp { retcode: 0, reply: 'Yeah!I\'m handsome cover!' }
socket closed.
```

server.js如下：

```
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
```

执行node server.js执行结果：

```
UDP Server listening on 127.0.0.1:33333
127.0.0.1:56636 - 
R U coverguo?
[object Object]from client!
UDP message reply to 127.0.0.1:56636
```

4. 静态编译使用方式

* 构造一个lm.helloworld.proto文件

```
package lm; 
message helloworld 
{ 
   required int32     id = 1;  // ID 
   required string    str = 2;  // str 
   optional int32     opt = 3;  //optional field 
}
```

* 静态编译：将.proto文件编译成lm.helloworld.js文件

执行脚本：pbjs -t static-module -w commonjs -o lm.helloworld.js lm.helloworld.proto

```
/*eslint-disable block-scoped-var, no-redeclare, no-control-regex, no-prototype-builtins*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.lm = (function() {

    /**
     * Namespace lm.
     * @exports lm
     * @namespace
     */
    var lm = {};

    lm.helloworld = (function() {

        /**
         * Properties of a helloworld.
         * @typedef lm.helloworld$Properties
         * @type {Object}
         * @property {number} id helloworld id.
         * @property {string} str helloworld str.
         * @property {number} [opt] helloworld opt.
         */

        /**
         * Constructs a new helloworld.
         * @exports lm.helloworld
         * @constructor
         * @param {lm.helloworld$Properties=} [properties] Properties to set
         */
        function helloworld(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * helloworld id.
         * @type {number}
         */
        helloworld.prototype.id = 0;

        /**
         * helloworld str.
         * @type {string}
         */
        helloworld.prototype.str = "";

        /**
         * helloworld opt.
         * @type {number}
         */
        helloworld.prototype.opt = 0;

        /**
         * Creates a new helloworld instance using the specified properties.
         * @param {lm.helloworld$Properties=} [properties] Properties to set
         * @returns {lm.helloworld} helloworld instance
         */
        helloworld.create = function create(properties) {
            return new helloworld(properties);
        };

        /**
         * Encodes the specified helloworld message. Does not implicitly {@link lm.helloworld.verify|verify} messages.
         * @param {lm.helloworld$Properties} message helloworld message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        helloworld.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            writer.uint32(/* id 1, wireType 0 =*/8).int32(message.id);
            writer.uint32(/* id 2, wireType 2 =*/18).string(message.str);
            if (message.opt != null && message.hasOwnProperty("opt"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.opt);
            return writer;
        };

        /**
         * Encodes the specified helloworld message, length delimited. Does not implicitly {@link lm.helloworld.verify|verify} messages.
         * @param {lm.helloworld$Properties} message helloworld message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        helloworld.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a helloworld message from the specified reader or buffer.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {lm.helloworld} helloworld
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        helloworld.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.lm.helloworld();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.id = reader.int32();
                    break;
                case 2:
                    message.str = reader.string();
                    break;
                case 3:
                    message.opt = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("id"))
                throw $util.ProtocolError("missing required 'id'", { instance: message });
            if (!message.hasOwnProperty("str"))
                throw $util.ProtocolError("missing required 'str'", { instance: message });
            return message;
        };

        /**
         * Decodes a helloworld message from the specified reader or buffer, length delimited.
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {lm.helloworld} helloworld
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        helloworld.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a helloworld message.
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {?string} `null` if valid, otherwise the reason why it is not
         */
        helloworld.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (!$util.isInteger(message.id))
                return "id: integer expected";
            if (!$util.isString(message.str))
                return "str: string expected";
            if (message.opt != null && message.hasOwnProperty("opt"))
                if (!$util.isInteger(message.opt))
                    return "opt: integer expected";
            return null;
        };

        /**
         * Creates a helloworld message from a plain object. Also converts values to their respective internal types.
         * @param {Object.<string,*>} object Plain object
         * @returns {lm.helloworld} helloworld
         */
        helloworld.fromObject = function fromObject(object) {
            if (object instanceof $root.lm.helloworld)
                return object;
            var message = new $root.lm.helloworld();
            if (object.id != null)
                message.id = object.id | 0;
            if (object.str != null)
                message.str = String(object.str);
            if (object.opt != null)
                message.opt = object.opt | 0;
            return message;
        };

        /**
         * Creates a helloworld message from a plain object. Also converts values to their respective internal types.
         * This is an alias of {@link lm.helloworld.fromObject}.
         * @function
         * @param {Object.<string,*>} object Plain object
         * @returns {lm.helloworld} helloworld
         */
        helloworld.from = helloworld.fromObject;

        /**
         * Creates a plain object from a helloworld message. Also converts values to other types if specified.
         * @param {lm.helloworld} message helloworld
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        helloworld.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.id = 0;
                object.str = "";
                object.opt = 0;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.str != null && message.hasOwnProperty("str"))
                object.str = message.str;
            if (message.opt != null && message.hasOwnProperty("opt"))
                object.opt = message.opt;
            return object;
        };

        /**
         * Creates a plain object from this helloworld message. Also converts values to other types if specified.
         * @param {$protobuf.ConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        helloworld.prototype.toObject = function toObject(options) {
            return this.constructor.toObject(this, options);
        };

        /**
         * Converts this helloworld to JSON.
         * @returns {Object.<string,*>} JSON object
         */
        helloworld.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return helloworld;
    })();

    return lm;
})();

module.exports = $root;

```

* demo.js

```
var test1 = require("./lm.helloworld.js");

var obj = {
	id: 1,
	str: "brian",
	opt: 3
};

var buffer = test1.lm.helloworld.encode(obj).finish();

console.log(buffer);

var obj = test1.lm.helloworld.decode(buffer);

console.log(obj);

var person = test1.lm.helloworld.create(obj);

console.log(person);
```

执行node demo.js如下：

```
<Buffer 08 01 12 05 62 72 69 61 6e 18 03>
helloworld { id: 1, str: 'brian', opt: 3 }
```


### 附录

* (在NodeJS中玩转Protocol Buffer)[http://imweb.io/topic/570130a306f2400432c1396c]

* (Protobuf 语法指南)[http://colobu.com/2015/01/07/Protobuf-language-guide/]


