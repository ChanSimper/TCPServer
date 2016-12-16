/**
 * Created by songjian on 2016/10/8.
 */

var commonSourceServer = require("../commonSource");
var ipconfig = require("../runconfig");

var defaultBufferSize = 1024;
var receiveBufferSize = defaultBufferSize;
var receiveBuffer = new Buffer(defaultBufferSize);
var receiveOffset = 0;
var recentDate = new Date();

var net = require('net');

var RecentProcess = true;//确保消息排队接收
var gjSocket = new net.Socket();

var flagConnect = 0;

/**
 * 生成 SN 标记，返回 SN 的值
 **/
var SNMax = 0;
function getSN() {
    SNMax++;
    if (SNMax == 65534) {
        SNMax = 0;
    }
    return SNMax;
}

/**
 * 函数名：start
 * 功能：gj的客户端，用于向后台 gj 服务端发送请求信息，并且接收后台的响应和推送信息
 * 目标源：卢楷程序
 */
function start() {

    function connectServer() {
        //HOST和PORT 在ipconfig.json文件中配置
        var x = gjSocket.connect(ipconfig.gjPORT, ipconfig.gjHOST);
    }

    connectServer();

    gjSocket.on('error', function (error) {
        if (flagConnect == 0) {
            commonSourceServer.errorLogFile.error('gjSocket Error :' + error.toString());
            var connectError = {
                "TYPE":"603",
                "content" : "与告警后台通信失败！"
            }
            var ErrorArray = [];
            ErrorArray.push(connectError);
            commonSourceServer.gjReceivePushArray.push(ErrorArray);
            commonSourceServer.EventEmitter.emit("receiveGJPushData");
            flagConnect = 1;
        }
        connectServer();
    });

    gjSocket.on('close', function () {
        console.log('gjSocket:connection closed on ' + recentDate);
       // connectServer();
    });

    gjSocket.on('connect', function () {
        console.log('[gjSocket] connect Ok.');
        flagConnect = 0;
      /*  commonSourceServer.EventEmitter.on("sendGJRequest", function () {
            if (!!commonSourceServer.gjStrArray[0]) {
                if (RecentProcess) {
                    /!**
                     * 将请求信息重新做包发送给后台
                     **!/
                    var RequestStr = commonSourceServer.gjStrArray.shift();

                    var SN = getSN();
                    commonSourceServer.gjRequestSN.push(SN);
                    console.log("gj RequestStr:" + RequestStr);
                    sendData(RequestStr, SN);
                }
            }
            else {
                //console.log('[else RecentProcess]:' + RecentProcess);
            }
        })*/
        setInterval(function () {
            if (!!commonSourceServer.gjStrArray[0]) {
                if (RecentProcess) {
                    /**
                     * 将请求信息重新做包发送给后台
                     **/
                    var RequestStr = commonSourceServer.gjStrArray.shift();

                    var SN = getSN();
                    commonSourceServer.gjRequestSN.push(SN);
                    console.log("gj RequestStr:" + RequestStr);
                    sendData(RequestStr, SN);
                }
            }
            else {
                //console.log('[else RecentProcess]:' + RecentProcess);
            }
        }, 100);
    });
    gjSocket.on('data', function (data) {
        try {
            bufferData(data);
        } catch (err) {
            commonSourceServer.errorLogFile.error("gj_index.js bufferData function err :" + err);
        }
    });
}

/**
 * 函数名：sendData
 * 功能 ：将前台请求信息传送给后台 gj 服务端
 * 参数 ：
 *   RequestStr ：前台请求信息
 *   SN ：向后台发送请求包的 SN 标识，暂时没用
 */
function sendData(RequestStr, SN) {
    var notifyDataBase = [];
    commonSourceServer.requestLogFile.info("[gj_index sendData]client send Data to GJ Server:" + RequestStr);
    var len = Buffer.byteLength(RequestStr);
    notifyDataBase.push(JSON.parse(RequestStr));
    var sendDbBuffer = new Buffer(len + 8);

    //写入2个字节特征码
    sendDbBuffer.writeUInt16BE(65534, 0);//0xfffe

    //写入2个字节编号
    sendDbBuffer.writeUInt16BE(SN, 2);

    //写入4个字节表示本次包长
    sendDbBuffer.writeUInt32BE(len, 4);

    //写入数据
    try {
        sendDbBuffer.write(RequestStr, 8);
        gjSocket.write(sendDbBuffer);
        commonSourceServer.gjReceivePushArray.push(notifyDataBase);
        commonSourceServer.EventEmitter.emit("receiveGJPushData");
    } catch (err) {
        commonSourceServer.errorLogFile.error("gj_index.js sendData function sendDbBuffer.write(RequestStr, 8) err :" + err);
    }

}

/**
 * 函数名：bufferData
 * 功能：用于接收后台返回请求的数据包
 * 参数：
 *   data ：返回的数据包信息
 */
function bufferData(data) {
    //如果当前数据包data的长度大于可用的receiveBuffer，new一个新的receiveData，之后进行旧有数据的拷贝。
    while (data.length > receiveBufferSize - receiveOffset) {
        //本次data需要的buffer大小为本data长度减去receiveBuffer中空闲buffer的大小。
        var dataNeedBufferSize = data.length - (receiveBufferSize - receiveOffset);
        //如果需要的buffer大小（dataNeedBufferSize）大于defaultBufferSize，则增加dataNeedBufferSize，否则增加dataNeedBufferSize，避免多个小包一起过来，导致多次扩大buffer。
        receiveBufferSize += dataNeedBufferSize > defaultBufferSize ? dataNeedBufferSize : defaultBufferSize;
        //console.log("receiveBufferSize : " + receiveBufferSize);
        var tmpReceiveBuffer = new Buffer(receiveBufferSize);
        receiveBuffer.copy(tmpReceiveBuffer);
        receiveBuffer = tmpReceiveBuffer;
    }

    //将当前数据包data拷贝进receiveBuffer，并修改偏移量receiveOffset
    data.copy(receiveBuffer, receiveOffset);
    receiveOffset += data.length;
    //console.log("receiveOffset : " + receiveOffset);

    while (receiveOffset > 8) {//已收数据超过包头大小，开始处理数据
        // console.log("0xfffe : " + receiveBuffer.readUInt16BE(0));
        if (receiveBuffer.readUInt16BE(0) == 65534 || receiveBuffer.readUInt16BE(0) == 65533) {//前台请求响应的数据
            var SN = receiveBuffer.readUInt16BE(2);
            //console.log("SN : "+SN);
            var len = receiveBuffer.readUInt32BE(4);
            console.log("buffer length:" + "len : " + len);
            if (len <= receiveOffset - 8) {//本条信息已经接收完成
                //根据len取出本次要处理的数据到dealDataBuffer，然后交由dealReceiveData函数处理
                var dealDataBuffer = new Buffer(len);
                receiveBuffer.copy(dealDataBuffer, 0, 8, 8 + len);
                if (receiveBuffer.readUInt16BE(0) == 65534) {
                    dealReceiveData(dealDataBuffer, SN);
                } else if (receiveBuffer.readUInt16BE(0) == 65533) {
                    dealReceivePushData(dealDataBuffer, SN);
                } else {
                    //console.log('error readUInt16BE(0)');
                }
                //计算出剩余的buffer的大小，从receiveBuffer中拷贝出剩余数据到leftReceiveBuffer，再将leftReceiveBuffer重新赋给receiveBuffer。
                var leftBufferSize = receiveOffset - (8 + len);
                var leftReceiveBuffer = new Buffer(leftBufferSize);
                receiveBufferSize = leftBufferSize;
                receiveBuffer.copy(leftReceiveBuffer, 0, 8 + len, receiveOffset);
                receiveBuffer = leftReceiveBuffer;
                receiveOffset -= (8 + len);
            }
            else {//没接完，跳出去，进行下一次data事件的监听
                break;
            }
        }
        else {//报文异常，执行初始化，退出
            receiveBufferSize = defaultBufferSize;
            receiveBuffer = new Buffer(receiveBufferSize);
            receiveOffset = 0;
        }
    }
}

/**
 * 函数名：dealReceiveData
 * 功能：用于处理所接收的数据包，在此处控制单进程
 * 参数 ：
 *   dealDataBuffer ：数据包信息
 */
function dealReceiveData(dealDataBuffer, SN) {

    var receiveDataString = dealDataBuffer.toString('utf8', 0);
    commonSourceServer.responseLogFile.info(" GJ Server response data :" + receiveDataString);
    // String 转换成 JSON
    var receiveDataJSON;
    try {
        receiveDataJSON = JSON.parse(receiveDataString);
    } catch (err) {
        commonSourceServer.errorLogFile.error("gj_index.js dealReceiveData function receiveDataJSON = JSON.parse(receiveDataString) err :" + err);
    }
    commonSourceServer.gjReceiveStrArray.push(receiveDataJSON);
    commonSourceServer.EventEmitter.emit("receiveGJData");
}

/**
 * 函数名：dealReceivePushData
 * 功能：用于处理后台推送过来的数据包
 * 参数 ：
 *   dealDataBuffer ：数据包信息
 */
function dealReceivePushData(dealDataBuffer, SN) {

    var receivePushDataString = dealDataBuffer.toString('utf8', 0);
    commonSourceServer.PushResponseLogFile.info('gj_index.js dealReceivePushData function receivePushDataString:' + receivePushDataString);
    //console.log('gj receivePushDataString:' + receivePushDataString)
    // String 转换成 JSON
    var receivePushDataJSON;
    try {
        receivePushDataJSON = JSON.parse(receivePushDataString);
    } catch (err) {
        commonSourceServer.errorLogFile.error("gj_index.js dealReceivePushData function receivePushDataJSON = JSON.parse(receivePushDataString) err :" + err);
    }
    console.log('receiveDataString :' + receivePushDataJSON);
    commonSourceServer.gjReceivePushArray.push(receivePushDataJSON);
    commonSourceServer.EventEmitter.emit("receiveGJPushData");
    commonSourceServer.EventEmitter.emit("sendGJRequest");
}

exports.gjClientStart = start;