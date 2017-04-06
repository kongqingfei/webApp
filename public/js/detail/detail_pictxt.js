/**
 * 商品详情页面 图文详情模块
 */
define(function(require, exports, module) {
    require('../common/base');
    require("../common/lazyload");
    // 模块内全局变量区
    var is_client = $.zheui.user_type() === 1;
    var is_weixin = $.zheui.user_type() === 2;
    var is_qq = $.zheui.user_type() === 3;
    var is_weibo = $.zheui.user_type() === 4;
    // var domainUrl = ["z2.tuanimg.com","z3.tuanimg.com","z4.tuanimg.com"]
    //var $obj = null;

    exports.pictxtShow = function(obj, data) {
        var pictxt_w = $(obj);
        var $obj = pictxt_w;
        if (data.length > 0) {
            pictxt_w.html(data);
            var imgs = pictxt_w.find("img");
            if (imgs.length) {
                $.zheui.check_iswebp(function(i) {
                    var isWebp = false;
                    // alert("$.os.android"+$.os.android);
                    //if ($.os.android) {
                        isWebp = i;
                    //};
                    showImg(imgs, isWebp, $obj);
                });
                if (is_client) {
                    var __allmethod_pic = {}; //获取所有的native支持的协议
                    //获取客户端支持的所有协议
                    $.common.get_allmethod("$.calljs.get_allmethodpiccallback");
                    $.calljs.get_allmethodpiccallback = function(data) {
                        __allmethod_pic = JSON.parse(data);
                        if (__allmethod_pic.open_imagewidget) {
                            $.zheui.bindTouchGoto(imgs, function(obj, index) {
                                var imgarr = [];
                                $.each(imgs, function(o, p) {
                                    var picurl = {
                                        "picurl": $(p).attr("data-url") || $(p).attr("src").replace(".400x.", ".800x.").replace(".600x.", ".800x.")
                                    };
                                    imgarr.push(picurl);
                                });
                                var param = {
                                    "index": index,
                                    "image_data": imgarr
                                };
                                $.common.open_imagewidget(param);
                            })
                        }
                    };
                }
            }
        } else {
            $(".dts_pic").html("暂无商品详情");
        }

    }

    /*图片data-url拼接*/
    function showImg(imgs, iswebp, $obj) {
        var whitelist = "z2.tuanimg.com,z3.tuanimg.com";
        var doUrl = whitelist.split(","); //白名单
        var doPort = window.location.href.split("//")[0]; //当前页面协议 例如：http:
        var doLen = doUrl.length; //白名单数组长度
        var num = 0; //当前白名单循环次数
        imgs.each(function(index) {
            var imgurl = $(this).attr("data-url");
            if (index == 0 && imgurl == null) {
                imgurl = $(this).attr("src");
                var fname_s = imgurl.split('/')[imgurl.split('/').length - 1].split('.')[0];
                if (parseInt(fname_s.split('x')[0]) < parseInt("150")) {
                    $(this).css("width", "");
                    $(this).css("display", "block");
                } else {
                    $(this).css("width", "100%");
                }
                if (!iswebp) {
                    $(this).attr('src', $(this).attr('src').replace(".webp", ""));
                }
                return true;
            } else if (index!=0 && imgurl == null || imgurl == "") { //第一个默认直接显示图片
                $(this).remove();
                return true;
            } else {
                try {
                    if (imgurl.indexOf("//") == -1 || imgurl.indexOf(".tuanimg.com") != -1) {
                        imgurl = singleImg(imgurl);
                        /*白名单拼接规则*/
                        if (imgurl.indexOf("//") != -1) {
                            var q = imgurl.split("//")[1];
                            imgurl = q.replace(q.split("/")[0], "");
                        }
                        num = parseInt(index / doLen);
                        imgurl = doPort + "//" + doUrl[index - doLen * num] + imgurl;
                        /*end*/
                        var fname_s = imgurl.split('/')[imgurl.split('/').length - 1].split('.')[0];
                        if (parseInt(fname_s.split('x')[0]) < parseInt("150")) {
                            $(this).css("width", "");
                            $(this).css("display", "block");
                        } else {
                            $(this).css("width", "100%");
                        }
                        if (iswebp && imgurl.indexOf(".jpg") != -1) {
                            imgurl = imgurl + ".webp";
                        }
                    } else {
                        $(this).css("width", "100%");
                    }
                    $(this).attr("data-url", imgurl);
                } catch (e) {
                    return false;
                }
            }
        });
        // var top = 0;
        // try {
        //     top = $('.js_detail').offset().top - $('.js_guild').offset().top;
        // } catch (e) {}
        $obj.find('img').picLazyLoad({
            threshold: 100
        });
    }

    /*图片大小尺寸逻辑处理 小于280原始图片 屏幕分辨率小于480取290x 大于取400x*/
    function singleImg(o) {
        var v = o.split('.');
        var vds = v[v.length - 2];
        var vdf = v[v.length - 1];
        var fname = o.split('/')[o.split('/').length - 1].split('.')[0];
        var wh = fname.split('x');
        var url = o;
        var wh = window.innerWidth;
        var dpr = window.devicePixelRatio;
        var fbl = wh * dpr;
        if (parseInt(fname.split('x')[0]) < 280) {
            if (vds.length < 20) {
                url = o.replace(vds + "." + vdf, vdf);
            }
        } else {
            if (vds.length > 20) {
                if (fbl <= 480) {
                    url = o.replace(vds + "." + vdf, vds + ".400x." + vdf);
                } else {
                    url = o.replace(vds + "." + vdf, vds + ".600x." + vdf);
                }
            } else {
                if (fbl <= 480) {
                    url = o.replace(vds + "." + vdf, "400x." + vdf);
                } else {
                    url = o.replace(vds + "." + vdf, "600x." + vdf);
                }
            }
        }
        return url;
    }
    // function domainUrlFun(arr){
    //     var imgUrlBef = arr;
    //     var imgUrlAft =[];
    //     var doUrlLen = domainUrl.length;
    //     var n=0;
    //     for(var j=0;j<imgUrlBef.length;j++){
    //         if(imgUrlBef[j]){
    //             if(imgUrlBef[j].indexOf("//") != -1){
    //                var q = imgUrlBef[j].split("//")[1];  
    //                imgUrlBef[j] = q.replace(q.split("/")[0],"");
    //             }
    //             n = parseInt(j/doUrlLen);
    //             var imgurl=domainUrl[j-doUrlLen*n]+imgUrlBef[j];
    //             imgUrlAft.push(imgurl);
    //         }  
    //     }
    //     return imgUrlAft;
    // }

});