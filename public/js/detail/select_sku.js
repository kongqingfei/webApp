// 选sku弹窗
// 无库存样式 btn-disabled
define(function (require, exports, module) {
    require("zepto");
    require('../common/base');
    require('../common/callnative'); //同步引入协议文件
    Swipe = require("../common/swipe");
    var T = require('../common/tool');
    var is_client = $.zheui.user_type() === 1;

    var select_sku = {

        init : function (opt) {
            var _this = this;
            opt = opt || {};
            this.sku = opt.stockInfo;
            this.size_attributes = opt.size_attributes;
            this.sku_num = opt.sku_num;
            this.isSure = false; // 点击了去购买标识
            this.sureBtn = null; // 去购买按钮
            this.stockCount = opt.stockCount; // sku实时库存
            this.headyouhui = null; //团长特惠优惠金额
            this.is_pin = true; // 是拼团买，还是单独买
            this.main_image = opt.main_image; // 商品主图
            // 处理main_image
            if (this.main_image.indexOf("//") === 0) {
                this.main_image = $.zheui.protocol + this.main_image;
            }
            this.pin_price = opt.pin_price; // 拼团价
            this.cur_price = opt.cur_price; // 单买价
            this.title = opt.title; // 商品标题
            this.selected = null; // 已选中sku
            this.pin_status = opt.pin_status; // 商品状态
            this.total = opt.stockCount.stock; //总库存值
            this.selectedCount = opt.stockCount.stock; // 选中的sku库存
            this.buy_count = 1; //购买的数量
            this.isWebp = true;
            // 是否支持webp
            $.zheui.check_iswebp(function(webp) {
                _this.isWebp = webp;
                // 渲染html
                _this.setBox();
                // 绑定事件
                _this.bindEvent();
                //确认订单页点击修改返回商品详情页后sku回填
                _this.BackToSku();

                _this.pin_status !==2 && $(".btn-sure").addClass("btn-disabled");
            });
        },
        // 设置拼团按钮文案
        setSureBtnTxt : function (str) {
            if (str) {
                $('.skubox .btn-sure').html(str);
            }
        },
        // 渲染html
        setBox : function () { 
            var _this = this;
            var data = _this.sku;
            var _html = [];
            var big_img_list = [];
            // 拼html
            if (data.img_list.length > 0) {
                _html.push(_this.creatSku(data.img_list, '颜色', '1'));
                $.each(data.img_list, function (ind, item) {
                    if (ind === 0) {
                        _this.main_image = item.vPicture || _this.main_image;
                    }
                    var url = item.vPicture.replace(/[^\/]*$/g, function (pa) {
                        if (pa) {
                            var arr = pa.split(".");
                            arr[2] = "750x";
                            return arr.join(".");
                        } else {
                            return "";
                        }
                    });
                    item.bigPicture = url;
                    big_img_list.push({picurl : url});
                });
            }
            // 如果big_img_list为空，将主图放入
            big_img_list.length === 0 && big_img_list.push({picurl : _this.main_image.replace("120x120", "700x")});
            _this.big_img_list = big_img_list;
            if (data.size_list.length > 0) {
                _html.push(_this.creatSku(data.size_list, '尺码', '2'));
            }

            _html.push(_this.createCount());
            $('.skubox-main').append(_html.join(''));

            // 设置标题和图片
            $('.skubox-product .tit .txt').html(_this.title);
            $('.skubox-product .tit .price span').html(_this.pin_price);
            $('.skubox-product .img').attr('src', _this.main_image);
        },
        creatSku : function (list, name, num) {
            var _this = this;
            var arr = [];
            var size_html = '';
            var $skubox_m = $('.skubox-main');
            if (Number($skubox_m.attr('data-showsize')) == 1 && num == 2) {
                size_html = '<span class="size_url js_size_url">查看尺码表<i></i></span>';
            }
            arr.push('<div class="skubox-main-blox skubox-main-blox-' + num + '">');
            arr.push('<span class="txt">' + name + size_html + '</span>');
            $.each(list, function (i, v) {
                arr.push('<a data-img="' + (v.vPicture ? (v.vPicture + (_this.isWebp ? ".webp" : "")) : "") + '" data-pid="' + v.pId + '" data-vid="' + v.vId + '" class="btn">' + v.vName + '</a>')
                if (num == 2 && _this.creatTable() && _this.creatTable().length > 0) {
                    $.each(_this.creatTable(), function (ind,val) {
                        if (val.tbKey == v.vName) {
                            arr.push('<div class="fix-table" style="display:none;"><i class="fix-table-close"></i><div class="fix-table-body">' + val.tbHtml + '</div></div><i class="fix-table-arrow" style="display:none;"></i>');
                            return false;
                        };
                    })
                };
            });
            arr.push('</div>');
            return arr.join('');
        },
        creatTable: function (){
            var _this = this;
            var t_head = '<tr>';
            var t_html = '';
            var t_arr = [];
            if (_this.size_attributes && _this.size_attributes.size) {
                var size_data = _this.size_attributes.size;
                var size_data_head = size_data.colhead;
                $.each(size_data_head,function (ind,item){
                    t_head += '<td>' + item + '</td>';
                });
                t_head += '</tr>'
                var index = 0;
                $.each(size_data,function (key,val){
                    var itemObj = {};
                    if (key == 'colhead') {return true};
                    if (!val || val.length == 0) {
                        t_arr.push('');
                        return true;
                    };
                    t_html = ''
                    t_html += '<table>';
                    t_html += t_head;
                    t_html += '<tr>';
                    $.each(val,function (i,v){
                        t_html += '<td>' + v + '</td>'
                    })
                    t_html += '</tr>'
                    t_html += '</table>';
                    index ++;
                    itemObj.tbKey = key;
                    itemObj.tbHtml = t_html;
                    t_arr.push(itemObj);
                })
                return t_arr;
            };
        },
        createCount: function (){
            var arr = [];
            arr.push('<div class="skubox-main-blox" id="sku_buy_count">购买数量');
            arr.push('  <span class="sku-count">')
            arr.push('      <i class="count reduceone reduce-no"></i>');
            arr.push('      <label id="buy_count">1</label>');
            arr.push('      <i class="count addone add-yes"></i>');
            arr.push('  </span>');
            arr.push('</div>');
            return arr.join('');
        },
        bindEvent : function() {
            var _this = this;
            var $buy_count = $('#buy_count');
            var $addone = $('.addone');
            var $reduceone = $('.reduceone');
            // 取消按钮
            $('.skubox .close,.skubox .btn-can').tap(function () {
                _this.hide();
            });
            // 一级sku选择
            $('.skubox-main-blox-1 .btn').tap(function () {
                if ($(this).hasClass('btn-disabled')) {
                    return;
                }
                if ($(this).hasClass('btn-sel')) {
                    $(this).removeClass('btn-sel');
                    $('.skubox-product .img').attr('src', _this.main_image);
                } else {
                    var imgsrc = $(this).attr('data-img');
                    if (imgsrc) {
                        $('.skubox-product .img').attr('src', imgsrc);
                    }
                    $('.skubox-main-blox-1 .btn').removeClass('btn-sel');
                    $(this).addClass('btn-sel');
                }
                _this.setSkuCount();
                _this.setSkuConfig();
            });
            // 二级sku选择
            $('.skubox-main-blox-2 .btn').tap(function (e) {
                var $fix_table = $('.fix-table');
                $fix_table.hide();
                $('.fix-table-arrow').hide();
                if ($(this).hasClass('btn-disabled')) {
                    return;
                }
                if ($(this).hasClass('btn-sel')) {
                    $(this).removeClass('btn-sel');
                    if ($(this).next().hasClass('fix-table')) {
                        $(this).next().hide().next().hide();
                    }
                } else {
                    $('.skubox-main-blox-2 .btn').removeClass('btn-sel');
                    $(this).addClass('btn-sel');
                    if ($(this).next().hasClass('fix-table')) {
                        $(this).next().show().next().show();
                        var w_width = $(window).width(),
                            tb_width = 300,
                            max_width = w_width - tb_width - 2*15;
                        $('.fix-table').css({
                            'top' : e.target.offsetTop-71 + 'px',   //71为表格的div块的高度
                            'left' : e.target.offsetLeft > max_width ? 'auto' : e.target.offsetLeft + 'px',
                            'right' : e.target.offsetLeft > max_width ? '16px' : 'auto'
                        })
                        $('.fix-table-arrow').css({
                            'top' : e.target.offsetTop-10 + 'px',   //71为表格的div块的高度
                            'left' : e.target.offsetLeft+15 + 'px'
                        })
                    }
                }
                _this.setSkuCount();
                _this.setSkuConfig();
            });
            //点击关闭
            $('.fix-table-close').tap(function () {
                $('.fix-table,.fix-table-arrow').hide();
            })
            // 初始化调用
            _this.setSkuCount();
            // 去购买
            $('.btn-sure').tap(function() {
                if ($(".btn-sure").hasClass("btn-disabled")) {return;}
                if ($buy_count.text() > _this.selectedCount) {
                    return $.zheui.toast('商品库存不足');
                }
                _this.buy_count = $buy_count.text();
                _this.sureBtn && _this.sureBtn.trigger('touchend');
            });
            // 点击查看大图
            $.zheui.bindTouchGoto($('.skubox-product .img'), function ($this) {
                var ind = $('.skubox-main-blox-1 .btn-sel').index();
                ind = ind === -1 ? 1 : ind;
                ind--;
                if (is_client) {
                    var param = {
                        "index": ind,
                        "image_data": _this.big_img_list
                    };
                    $.common.open_imagewidget(param);
                } else {
                    _this.showBigImg(ind);
                }
            }, false);
            //购买数量减一
            $.zheui.bindTouchGoto($reduceone, function() {
                var count = $buy_count.text();
                if (count <= 1) return;
                if (count == _this.selectedCount || count == _this.total) {
                    $addone.removeClass('add-no').addClass('add-yes');
                }
                count = parseInt(count) - 1;
                $buy_count.text(count);
                if (count <= 1) {
                    $reduceone.removeClass('reduce-yes').addClass('reduce-no');
                }
            });
            //购买数量加一
            $.zheui.bindTouchGoto($addone, function() {
                var count = $buy_count.text();
                if (count == _this.selectedCount || count == _this.total) {
                    return $.zheui.toast('商品库存不足');
                }
                count = parseInt(count) + 1;
                $buy_count.text(count);
                if (count == _this.selectedCount || count == _this.total) {
                    $addone.removeClass('add-yes').addClass('add-no');
                }
                if ($reduceone.hasClass('reduce-no') && count > 1) {
                    $reduceone.removeClass('reduce-no').addClass('reduce-yes');
                }
            });
        },
        showBigImg: function(index) {
            var _this = this;
            var $bigImgMain = $("#sku_bigimg_main"),
                $bigImg = $('#sku_bigimg');
            if (!_this.sku_swipe_load) {
                _this.sku_swipe_load = true;
                var tpl = "";
                tpl += "<ul>";
                var ind_name = "";
                $.each(_this.sku.img_list.length === 0 ? [{bigPicture : _this.main_image, vName : ""}] : _this.sku.img_list, function (ind, item) {
                    var url = item.bigPicture;
                    url = url.replace("120x120", "700x");
                    if (index === ind) {
                        ind_name = item.vName;
                        tpl += '<li><img vname="' + item.vName + '" src="' + url + '""></li>';
                    } else {
                        tpl += '<li><img vname="' + item.vName + '" src="' + _filterUri("/img/replace.png") + '" data-url="' + url + '"></li>';
                    }
                });
                tpl += "</ul><div class='num_box'>";
                if (ind_name) {
                    tpl += "<span class='txt'>" + ind_name + "</span>";
                }
                if (_this.sku.img_list.length > 0) {
                    tpl += "<span class='num'>" + (index + 1) + "&nbsp;/&nbsp;" + _this.sku.img_list.length + "</span>";
                }
                tpl += "</div>";
                $bigImgMain.html(tpl);
                //绑定大图滑动事件
                setTimeout(function() {
                    _this.sku_swipe = Swipe($bigImgMain[0], {
                        startSlide: index,
                        continuous: false,
                        disableScroll: false,
                        stopPropagation: false,
                        callback: function(index, element) {
                            var $img = $bigImgMain.find('img').eq(index);
                            if ($img.attr('data-url')) {
                                $img.attr("src", $img.attr("data-url")).removeAttr('data-url');
                            }
                            $bigImgMain.find('.num').html((index + 1) + '&nbsp;/&nbsp;' + _this.big_img_list.length);
                            $bigImgMain.find('.txt').html($img.attr("vname"));
                        },
                        transitionEnd: function(index, element) {}
                    });
                }, 0);
                // 点击取消大图
                $.zheui.bindTouchGoto($(".num_box, #sku_bigimg, #sku_bigimg_main ul"), function () {
                    event.preventDefault();
                    $bigImg.hide();
                    $bigImgMain.hide();
                    $("body,html").removeClass("scroll_disable");
                    return false;
                });
                $('.num_box, #sku_bigimg_main ul').on('touchstart', function(event) {
                    return false;
                });
            } else {
                _this.sku_swipe && _this.sku_swipe.slide(index);
            }
            $("body,html").addClass("scroll_disable");
            $bigImg.show();
            $bigImgMain.show().css('top', (window.innerHeight - $bigImgMain.height()) / 2);
        },
        // 根据当前选择情况渲染sku可点击性
        setSkuCount : function () {
            var _this = this;
            var sel1 = $('.skubox-main-blox-1 .btn-sel');
            var sel2 = $('.skubox-main-blox-2 .btn-sel');
            if (_this.pin_status !== 2) { // 非在售商品全部置灰
                $(".skubox-main-blox-1 .btn").each(function (ind, item) {
                    $(item).addClass("btn-disabled");
                });
                $(".skubox-main-blox-2 .btn").each(function (ind, item) {
                    $(item).addClass("btn-disabled");
                });
            } else if (sel1.length === 0 && sel2.length === 0) { // 都没选中
                $(".skubox-main-blox-1 .btn").each(function (ind, item) {
                    var count = _this.stockCount.img_map[$(item).data("vid")];
                    if (count > 0) {
                        $(item).removeClass("btn-disabled");
                    } else {
                        $(item).addClass("btn-disabled");
                    }
                });
                $(".skubox-main-blox-2 .btn").each(function (ind, item) {
                    var count = _this.stockCount.size_map[$(item).data("vid")];
                    if (count > 0) {
                        $(item).removeClass("btn-disabled");
                    } else {
                        $(item).addClass("btn-disabled");
                    }
                });
                _this.selectedCount = _this.total;
            } else if (sel1.length && sel2.length) { // 颜色尺码都选中
                $(".skubox-main-blox-2 .btn").each(function (ind, item) {
                    var count = _this.stockCount.sku_map[sel1.data("vid") + ":" + $(item).data("vid")];
                    if (count > 0) {
                        $(item).removeClass("btn-disabled");
                    } else {
                        $(item).addClass("btn-disabled");
                    }
                });
                $(".skubox-main-blox-1 .btn").each(function (ind, item) {
                    var count = _this.stockCount.sku_map[$(item).data("vid") + ":" + sel2.data("vid")];
                    if (count > 0) {
                        $(item).removeClass("btn-disabled");
                    } else {
                        $(item).addClass("btn-disabled");
                    }
                });
                _this.selectedCount = _this.stockCount.sku_map[sel1.data('vid') + ':' + sel2.data('vid')]; //选中的sku的真实库存
            } else if (sel1.length) { // 选中颜色
                $(".skubox-main-blox-2 .btn").each(function (ind, item) {
                    var count = _this.stockCount.sku_map[sel1.data("vid") + ":" + $(item).data("vid")];
                    if (count > 0) {
                        $(item).removeClass("btn-disabled");
                    } else {
                        $(item).addClass("btn-disabled");
                    }
                });
                _this.selectedCount = _this.stockCount.img_map[sel1.data('vid')];
            } else if (sel2.length) { // 选中尺码
                $(".skubox-main-blox-1 .btn").each(function (ind, item) {
                    var count = _this.stockCount.sku_map[$(item).data("vid") + ":" + sel2.data("vid")];
                    if (count > 0) {
                        $(item).removeClass("btn-disabled");
                    } else {
                        $(item).addClass("btn-disabled");
                    }
                });
                _this.selectedCount = _this.stockCount.size_map[sel2.data('vid')];
            }
        },
        // 根据当前选择情况作下一步处理
        setSkuConfig : function(){
            var _this = this;
            // 获取选中sku
            var sel1 = $('.skubox-main-blox-1 .btn-sel');
            var sel2 = $('.skubox-main-blox-2 .btn-sel');
            var btn1 = $('.skubox-main-blox-1 .btn');
            var btn2 = $('.skubox-main-blox-2 .btn');
            var sel_sku_key = "";
            var sel_sku_r = '';
            if (btn1.length && btn2.length) { //颜色、尺码都有
                if (sel1.length && sel2.length) {
                    sel_sku_key = sel1.data("pid") + "-" + sel1.data("vid") + ":" + sel2.data("pid") + "-" + sel2.data("vid");
                }
            } else if (btn1.length) { //只有颜色
                if (sel1.length) {
                    sel_sku_key = sel1.data("pid") + "-" + sel1.data("vid");
                }
            } else if (btn2.length) { //只有尺码
                if (sel2.length) {
                    sel_sku_key = sel2.data("pid") + "-" + sel2.data("vid");
                }
            }
            if (sel_sku_key) {
                _this.selected = _this.sku.sku_map[sel_sku_key];
            } else { //未选中任何sku
                _this.selected = null;
            }
            if (!_this.selected) {
                $('.skubox-product .price span').html(_this.is_pin ? _this.pin_price : _this.cur_price);
                return;
            }
            // 计算购买价格
            var price = _this.is_pin ? _this.selected.pinPrice : _this.selected.curPrice;
            if(_this.headyouhui) { //减掉团长特惠金额
                price = T.float_accSub(price, _this.headyouhui); 
            }
            _this.selected.sku_price = price;
            $('.skubox-product .price span').html(_this.selected.sku_price);
        },
        show: function() {
            $('.skubox').removeClass('skubox_hide').addClass('skubox_show');
            $(".skubox_bg").show();
            // 禁用body和html滚动条
            $("body").data("scroll_top", $("body").scrollTop());
            $("body,html").addClass("scroll_disable");
            // 判断一下，若sku下只有一项，默认选中
            $('.skubox-main-blox-1 .btn').length === 1 && $('.skubox-main-blox-1 .btn').trigger("tap");
            $('.skubox-main-blox-2 .btn').length === 1 && $('.skubox-main-blox-2 .btn').trigger("tap");
        },
        hide: function() {
            this.isSure = false;
            $('.skubox').removeClass('skubox_show').addClass('skubox_hide');
            $(".skubox_bg").hide();
            // 恢复body和html滚动条
            $("body,html").removeClass("scroll_disable");
            $("body").scrollTop($("body").data("scroll_top"));
        },
        BackToSku: function() {
            var _this = this;
            if(_this.sku_num){
                sku_arr = _this.sku_num.split(':');
                $.each(sku_arr, function(i, p) {
                    if (p) { //pid-vid
                        var pid = p.split('-')[0];
                        var vid = p.split('-')[1];
                        $('[data-pid="'+pid+'"][data-vid="'+vid+'"]').trigger('tap');
                    }
                });
            }
        }
    }

    module.exports = select_sku;
});