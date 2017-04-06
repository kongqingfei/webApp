/**
 * 图文详情
 */
define(function(require, exports, module) {
    require("zepto");
    require('../common/base');
    var T = require('../common/tool');
    var zid = $.zheui.getUrlKeyVal("zid");
    T.proxy_getJSON("/nnc/product/detail_content.json?zid=" + zid, function (ret) {
      if (ret.data) {
          var pictxt = require("./detail_pictxt");
          pictxt.pictxtShow($("#ct"), ret.data);
      }
    });
});