/**
 * Created by songjian on 2016/9/26.
 */
var dbStrArray = [],dbNameArray = [],dbReceiveStrArray = [],dbSN = [];
var esStrArray = [],esNameArray = [],esReceiveStrArray = [],esSN = [];
var jxStrArray = [],jxNameArray = [],jxReceiveStrArray = [],jxSN = [];
var lsStrArray = [],lsNameArray = [],lsReceiveStrArray = [],lsSN = [];
var oaStrArray = [],oaNameArray = [],oaReceiveStrArray = [],oaSN = [];

/**

//存储db、es、jx、ls、oa的请求信息和客户端名
exports.dbStrArray = dbStrArray;
exports.dbNameArray = dbNameArray;
//存储后台返回的db、es、jx、ls、oa的消息
exports.dbReceiveStrArray = dbReceiveStrArray;
//存储客户端请求时db、es、jx、ls、oa的SN值
exports.dbSN = dbSN;

**/
/** 数据库 **/
exports.dbStrArray = dbStrArray;
exports.dbNameArray = dbNameArray;
exports.dbReceiveStrArray = dbReceiveStrArray;
exports.dbSN = dbSN;
/** elasticsearch **/
exports.esStrArray = esStrArray;
exports.esNameArray = esNameArray;
exports.esReceiveStrArray = esReceiveStrArray;
exports.esSN = esSN;
/** 基线 **/
exports.jxStrArray = jxStrArray;
exports.jxNameArray = jxNameArray;
exports.esReceiveStrArray = jxReceiveStrArray;
exports.esSN = jxSN;
/** 漏扫 **/
exports.lsStrArray = lsStrArray;
exports.lsNameArray = lsNameArray;
exports.esReceiveStrArray = lsReceiveStrArray;
exports.esSN = lsSN;
/** 运维审计 **/
exports.oaStrArray = oaStrArray;
exports.oaNameArray = oaNameArray;
exports.esReceiveStrArray = oaReceiveStrArray;
exports.esSN = oaSN;
