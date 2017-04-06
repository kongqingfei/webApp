define(function(require, exports, module) {
	require("zepto");
	require('../common/base');
	require.async('/js/common/lazyload.js');
	var T = require('../common/tool'),
		Swipe = require("../common/swipe");
	var base64 = require('../common/base64');
	var base64str = new base64();

	function detail() {
		this.data = {
			islogin: false,
			zid: $.zheui.getUrlKeyVal('zid'),
			city_id: '',
			is_client: $.zheui.user_type() === 1,
			is_weixin: $.zheui.user_type() === 2,
			is_qq: $.zheui.user_type() === 3,
			is_weibo: $.zheui.user_type() === 4,
			pub_page_from: this.is_client ? "zheclient" : "weixin",
			tno: $.zheui.getUrlKeyVal('tno'),
			nearby:$.zheui.getUrlKeyVal('nearby'),
			track_data: {
				pos_type: "pdetai",
				pos_value: "pdetai",
				zid: $.zheui.getUrlKeyVal('zid'),
				dealId: $.zheui.getUrlKeyVal("id") || prod_info.dealid
			},
			curTabIndex: 0, //当前所在页签索引
			cache_scrolls: [], //缓存每个页签对应的页面滚动条高度
			realInfo: '', //实时数据
			is_head_free: 0, // 团长特惠资格  1:有，0:没有
			headyouhui: 0, //团长特惠优惠金额
			multi_hasmore: true, //多品团仍有未展示商品
			multi_cur_page: 1 // 多品团商品当前页码
		};
		this.dom = {
			//$headTabs: $('.headers-tabs'),
			$bannerImgs: $('div.bannerimgs'),
			$rcList: $("ul.rc-list"),
			$js_detail: $('div.js_detail'),
			$skubox: $('.skubox'),
			$order_in: $('.order_in'),
			$pool_md: $('.pool_md')
		};
		this.event = {
			pageSwipe: '',
			imgSwipe: '',
			selectSku: '',
			myDialog: '',
			exposure: ''
		};
	}
	detail.prototype = {
		init: function() {
			T.proxy_getJSON('/login/authenticate.json', function(data) {
				_this.data.islogin = data.islogin;
			});
			// 如果是拼团玩法新用户，显示上面的的拼团玩法，隐藏下面的拼团玩法
			T.is_old_intr(function(is_old) {
				if (!is_old) {
					$(".guild_top").show();
					$(".guild_bottom").hide();
				}
			});
			if (_this.data.is_client) {
				//_this.dom.$headTabs && _this.dom.$headTabs.parent().remove(); //清除双页签样式
				$('.wrapper').addClass('notabs');
				$('.product').removeClass('swipe');
				_this.dom.$bannerImgs.find('li.last').remove();
				require('../common/callnative'); //同步引入协议文件
				$.common.get_allmethod("$.calljs.get_allmethodcallback");
				$.calljs.get_allmethodcallback = function(data) {
					if (JSON.parse(data).open_imagewidget) {
						_this.data.open = true;
					}
				};
				T.get_native_info(function(ret) {
					_this.data.nativeinfo = ret || {};
				});
			} else { //客户端里面不显示双页签
				//兼容h5无返回首页按钮
				$('.homebtn').removeClass('hide');
				$('.kefubtn').css({'width':'10.8%','left':'10.8%'});
				if (prod_info.coupon_goods) {
					$('.group_btn').css({'width':'78.4%','margin-left':'21.6%'});
				} else {
					$('.group_btn').css('width','39.2%');
					$('.single_btn').css({'width':'39.2%','margin-left':'21.6%'});
				}
				this.initPageSwipe(); //页面切换
			}
			this.initImgSwipe(); //商品页签图片切换
			this.bindEvent(); //绑定事件
			this.getRealProduct(); //查询商品实时信息
			T.get_pintuan_city_id(function(city_id) {
				_this.data.city_id = city_id;
			});
			$.zheui.check_iswebp(function(webp) {
				_this.data.isWebp = webp;
				if (webp) {
					_this.slideImgsWebp(); //修改轮播图图片格式
				}
				// 初始化首图
				var firstImg = _this.dom.$bannerImgs.find("img").eq(0);
				firstImg.attr("src", firstImg.attr("data-url")).removeAttr('data-url');
			});
			require.async('/js/common/exposure.js', function(exposure) { //商品曝光统计
				_this.event.exposure = exposure;
			});
			require.async('/js/common/outjump.js', function(outjump) { //out跳转
				outjump.init({
					pos_type: _this.data.track_data.pos_type,
					pos_value: _this.data.track_data.pos_value
				});
			});
			//设置客户端、微信端标题
			T.setTit('商品详情');
			require.async('/js/common/track_v2.js', function() {
				require.async("/js/commonbar/commonbar.js", function(CommonBar) {
					CommonBar.topInit(_this.getShareParams(), document.title, {
						title: prod_info.title,
						pinPrice: prod_info.pin_price,
						shareTitle: prod_info.shareTitle
					});
				});
			});
			if (!_this.data.is_client) { //非客户端
				window.localStorage.detail_back = true; //详情页返回列表页位置定位使用  
			}
		},
		initPageSwipe: function() {
			this.event.pageSwipe = Swipe(document.querySelector('.wrapper'), {
				startSlide: 0,
				continuous: false,
				disableScroll: false,
				stopPropagation: false,
				callback: function(index, element) {
					// _this.dom.$headTabs.find('span').removeClass('hover').eq(index).addClass('hover');
					if (index == 1 && !_this.dom.$js_detail.attr('is_geting')) { //图文详情&&没查询过
						_this.getDetailPicTxt(function() {
							setContentH(element);
						});
					} else {
						setContentH(element);
					}
					var isExist = false;
					$.each(_this.data.cache_scrolls, function(i, p) {
						if (p.id == 'tab_' + index) {
							$(window).scrollTop(p.top);
							isExist = true;
							return false;
						}
					});
					!isExist && $(window).scrollTop(0);
					_this.data.curTabIndex = index;
				},
				transitionEnd: function(index, element) {}
			});

			function setContentH(element) {
				var curPageH = $(element).height();
				$('div.content').height(curPageH < window.innerHeight ? window.innerHeight : curPageH);
			}
			$('.swipe').removeClass('hide');
		},
		initImgSwipe: function() {
			this.dom.$bannerImgs.find('img,li.last').height(window.innerWidth);
			this.event.imgSwipe = Swipe(document.querySelector('.bannerimgs'), {
				startSlide: 0,
				continuous: false,
				disableScroll: false,
				stopPropagation: true,
				callback: function(index, element) {
					if (index < _this.dom.$bannerImgs.data('length')) {
						_this.dom.$bannerImgs.find('.num').html((index + 1) + "/" + _this.dom.$bannerImgs.data('length'));
						var $img = $(element).find('img');
						if ($img.attr('data-url')) {
							$img.attr("src", $img.attr("data-url")).removeAttr('data-url');
						}
					} else { //切换到图文详情页签
						_this.event.pageSwipe.slide(1);
					}
				},
				transitionEnd: function(index, element) {
					if (index == _this.dom.$bannerImgs.data('length')) {
						_this.event.imgSwipe.slide(_this.dom.$bannerImgs.data('length') - 1); //显示到最后一张图片
					}
				}
			});
			this.dom.$bannerImgs.find('img,li').removeClass('hide');
		},
		bindEvent: function() {
			//顶部页签点击事件
			/*if (!_this.data.is_client) {
				$.zheui.bindTouchGoto(_this.dom.$headTabs.find('li'), function($this, index) {
					$this.siblings().find('span').removeClass('hover');
					$this.find('span').addClass('hover');
					if (index == 1 && !_this.dom.$js_detail.attr('is_geting')) { //图文详情&&没查询过
						_this.getDetailPicTxt(function() {
							_this.event.pageSwipe.slide(index);
						});
					} else {
						_this.event.pageSwipe.slide(index);
					}
				});
			}*/

			//评论跳转页面
			$.zheui.bindTouchGoto($('.comment-tit, .btn-tag, .comment-list, .comment-foot'), function($this) {
				T.jump_page($this.attr('data-url'));
			}, false);
			
			//评论图懒加载
			if($('.comment img').length){
				$('.comment img').picLazyLoad({ 
					threshold: 150
				});
			}

			//拼团玩法详情
			$.zheui.bindTouchGoto($('div.js_guild'), function($this) {
				var type = 0;
				if (prod_info.isInviteNew == 1) { //邀新团
					type = 2;
				} else if (prod_info.activity_type == 1) { //抽奖
					type = 1;
				}
				T.jump_page($.zheui.domain + "/intr/intr" + $.zheui.urlSuffix + '?type=' + type);
			}, false);
			_this.initBuyBtn();
			//点击查看大图
			$.zheui.bindTouchGoto(_this.dom.$bannerImgs.find('li'), function($this, index) {
				if (_this.data.open) { //客户端调用大图方法
					var imgarr = [];
					$.each(_this.dom.$bannerImgs[0].getElementsByTagName('img'), function(index, item) {
						imgarr.push({
							picurl: item.getAttribute('data-url') || item.getAttribute("src")
						});
					});
					var param = {
						"index": index,
						"image_data": imgarr
					};
					$.common.open_imagewidget(param);
				} else { //调用大图方法
					_this.showBigImg(index);
				}
			}, false);
			//返回事件
			// $.zheui.bindTouchGoto($('span.back'), function($this) {
			// 	T.return_index();
			// });
			//滚动事件
			$(window).scroll(function() {
				var winHeight = $(window).scrollTop() + window.innerHeight;
				if ((winHeight + 250 >= $('.ordering').offset().top) && !_this.data.tno && !_this.dom.$order_in.attr('is_geting')) {
					_this.getOrdering(); //加载进行中的团
				}
				if ($('.pool_md').length && prod_info.multi_tuan && (winHeight + 200 >= $('.pool_md').offset().top) && !_this.dom.$pool_md.attr('is_geting')) {
					_this.getMultiList(); //加载多拼团
				}
				if ((winHeight + 150 >= $('.recommend').offset().top) && !_this.dom.$rcList.attr('is_geting')) {
					_this.getRecommendProducts(); //加载商品推荐
				}
				if ((winHeight + 50 >= $('div.js_detail').offset().top) && !_this.dom.$js_detail.attr('is_geting')) {
					_this.getDetailPicTxt(); //加载图文详情
				}
				var isHas = false;
				$.each(_this.data.cache_scrolls, function(i, p) {
					if (p.id == 'tab_' + _this.data.curTabIndex) {
						p.top = $(window).scrollTop();
						isHas = true;
						return false;
					}
				});
				if (!isHas) {
					_this.data.cache_scrolls.push({
						id: 'tab_' + _this.data.curTabIndex,
						top: $(window).scrollTop()
					});
				}
			});
			//首页icon
			$.zheui.bindTouchGoto($('.homebtn'), function($this) {
				T.return_index();
			});
			// 在线客服
			$.zheui.bindTouchGoto($('.kefubtn'), function($this) { //在线客服
				var url = $.zheui.protocol + "//" + T.domain.im + "/h5/index" + $.zheui.urlSuffix + "?busUid=35&type=service&shopname=%E6%8A%98800%E5%AE%A2%E6%9C%8D";
				_this.pvuvStatistics("pdetai", "pdetai_" + _this.data.zid, "im", "1", "button", "1", "page_clicks");
				// 4.12.6以上版本跳native版本im，否则跳h5
				if (_this.data.is_client) {
					T.get_version(function (vs) {
						//未登录
						if (!_this.data.islogin) {
							T.to_login();
						} else {
							if (vs[0] > 4 || vs[0] === 4 && vs[1] > 12 || vs[0] === 4 && vs[1] === 12 && vs[2] >= 6) {
								// window.location.href = "zhe800://m.zhe800.com/mid/im/service?category=1&type=0&from=isFromH5Smart&zid=" + _this.data.zid;
								T.jump_page($.zheui.protocol + "//" + T.domain.im + "/h5/robot/built/index.html?resource=pindetail&group=35&zid=" + _this.data.zid);
							} else {
								T.jump_page(url);
							}
						}
					});
					return;
				}
				// _this.pvuvStatistics("pdetai", "pdetai_" + _this.data.zid, "im", "2", "customservice", "1", "page_exchange");
				//未登录
				if (!_this.data.islogin) {
					T.to_login();
				} else {
					T.jump_page(url);
				}
			});
			$.zheui.delegateTouchGoto('.js_size_url', function($this) {
            	var $skubox_m = $('.skubox-main');
            	if ($skubox_m) {
            		T.jump_page($.zheui.protocol + '//' + T.domain.pina_m + '/detail/size_table.html?zid=' + _this.data.zid);
            	}
			});
		},
		initBuyBtn: function() {
			var $goIndex = $('.goIndexBtn'),
				$buyBtns = $("#buyGroup,#buySingle,#buyNow");
			//去首页逛逛
			if ($goIndex.length > 0) {
				$.zheui.bindTouchGoto($goIndex, function() {
					T.return_index();
				})
			}
			//组团购买、单独购买、立即购买
			if ($buyBtns.length > 0) {
				$.zheui.bindTouchGoto($buyBtns, function($this) {
					_this.buyBtnClick($this.attr('id'));
				});
			}
		},
		getShareParams: function() { //获取分享数据
			var track_data_str = $.tracklog.trackOutstr($.extend({}, _this.data.track_data));
			var to_url = $.zheui.protocol + "//" + T.domain.pina_m + "/detail/detail" + $.zheui.urlSuffix + "?id=" + prod_info.dealid + "&zid=" + prod_info.zid + "";
			var out_url = $.zheui.protocol + "//" + T.domain.out + '/jump?url=' + encodeURIComponent(to_url) + "&" + track_data_str;
			var opt = {
				"out_url": out_url,
				"content": '加入拼购行动，团伙享好货，一起品优鲜~',
				"title": prod_info.title,
				"pic_url": prod_info.shop_images[0].replace(".700x.", ".220x220."),
				"mainimg_url": prod_info.shop_images[0].replace(".700x.", ".220x220."),
				"pic_url_hd": prod_info.shop_images[0],
				"_ga": {
					"share_source": 'pdetai',
					"t": "",
					"leaderflag": "0",
					"d": prod_info.dealid
				},
				zid: prod_info.zid,
				price: prod_info.pin_price,
				"sharePage": 2 //商品详情页
			}
			return opt;
		},
		slideImgsWebp: function() {
			var imgs = _this.dom.$bannerImgs[0].getElementsByTagName('img');
			for (var i = 0; i < imgs.length; i++) {
				imgs[i].setAttribute('data-url', imgs[i].getAttribute('data-url') + '.webp');
			}
			// imgs[0].setAttribute('src', imgs[0].getAttribute('src') + '.webp');
		},
		showBigImg: function(index) {
			var imgarr = _this.dom.$bannerImgs[0].getElementsByTagName('img'),
				$bigImgMain = $("#dt_bigimg_main"),
				$bigImg = $('#dt_bigimg');
			if (!_this.data.big_swipe_img_load) {
				_this.data.big_swipe_img_load = true;
				var tpl = "";
				tpl += "<ul>";
				for (var i = 0; i < imgarr.length; i++) {
					var url = imgarr[i].getAttribute('data-url') || imgarr[i].getAttribute("src");
					if (index == i) {
						tpl += '<li><img src=' + url + '></li>';
					} else {
						tpl += '<li><img src=' + _filterUri("/img/replace.png") + ' data-url=' + url + '></li>';
					}
				}
				tpl += "</ul><div class='num_box'><span class='num'>" + (index + 1) + "&nbsp;/&nbsp;" + imgarr.length + "</span></div>";
				$bigImgMain.append(tpl);
				//绑定大图滑动事件
				setTimeout(function() {
					_this.event.bigSwipeImg = Swipe(document.getElementById('dt_bigimg_main'), {
						startSlide: index,
						continuous: false,
						disableScroll: false,
						stopPropagation: true,
						callback: function(index, element) {
							var $img = $bigImgMain.find('img').eq(index);
							if ($img.attr('data-url')) {
								$img.attr("src", $img.attr("data-url")).removeAttr('data-url');
							}
							$bigImgMain.find('.num').html((index + 1) + '&nbsp;/&nbsp;' + imgarr.length);
						},
						transitionEnd: function(index, element) {}
					});
				}, 0);
				// 点击取消大图
				$.zheui.bindTouchGoto($(".num_box, #dt_bigimg, #dt_bigimg_main ul"), function() {
					$bigImg.hide();
					$bigImgMain.hide();
					$("body,html").removeClass("scroll_disable");
				});
				$('.num_box,#dt_bigimg_main ul').on('touchstart', function(event) {
					return false;
				});
			} else {
				_this.event.bigSwipeImg && _this.event.bigSwipeImg.slide(index);
			}
			$("body,html").addClass("scroll_disable");
			$bigImg.show();
			$bigImgMain.show().css('top', (window.innerHeight - $bigImgMain.height()) / 2);
		},
		getRealProduct: function() { //无缓存商品数据包括团长特惠资格、用户限购次数
			var _t = this;
			T.get_device_id(function() { //如果是客户端，获取设备号存入cookie中,限购接口使用
				T.proxy_getJSON('/cns/products/' + _this.data.zid + '/realtime_info.json?tno=' + _this.data.tno + '&activityDealId=' + prod_info.activityDealId + '', function(ret) {
					if (ret.status === 200) {
						_this.data.realInfo = ret.data;
						if (ret.data.pin_status != prod_info.pin_status) { //实时状态已变更需要修改页面部分信息
							_this.getRealProdAfterUpdate(ret.data);
						}
						
						if (!prod_info.telephone_fare && prod_info.skuLength) { //有sku
							_this.initSelectSku();
							_this.getRealProdAfterEvent();
							_t.sourceBuyOrderSku(); //确认订单页 修改sku  返回参团状态的商品详情页并自动调起sku浮层
							if (prod_info.isInviteNew == 1 || prod_info.activity_type == 1) { 
								$('#sku_buy_count').hide(); //隐藏sku中购买数量
							}
						}
						if (!prod_info.tno && prod_info.isInviteNew != 1 && !prod_info.telephone_fare) { //非参团、邀新团、话费商品
							$.getJSON("/cns/coupon/getValuePinCouponForZid.json?zid=" + prod_info.zid + "", function(ret) {
								if (ret.status == 200 && ret.data && ret.data.pinCouponCode) { // 具有团长免单资格
									$('#sku_buy_count').hide();
									_this.data.headFree = ret.data;
									_this.setHeadPrice();
								}
							});
						}
					}
				});
			});
		},
		sourceBuyOrderSku: function() {
			var _t = this;
			var sku_num = $.zheui.getUrlKeyVal('sku_num');
			var event_id = $.zheui.getUrlKeyVal('event_id');
			if (sku_num) {
				_t.showSelectSku(event_id);
				//_this.event.selectSku.selected = sku_num;
			}
		},
		getOrdering: function() { //查询进行中的团
			_this.dom.$order_in.attr('is_geting', true);
			if (prod_info.isInviteNew == 1) { //邀新团
				// 用户已登录且为新用户才显示
				T.is_new_user(function(is_new) {
					is_new && _this.data.islogin && order_in(); //新用户
				});
			} else {
				order_in();
			}

			function order_in() {
				$.getJSON('/nnc/orders/get_grouping_order.json?zid=' + _this.data.zid + '&pool_id=' + prod_info.multi_tuan, function(ret) {
					if (ret.status === 200 && ret.data.list.length > 0) {
						var arr = [];
						$.each(ret.data.list, function(ind, item) {
							if (ind > 0) {
								arr.push('<hr class="line" />');
							}
							var track_data_str = $.tracklog.trackOutstr($.extend({}, _this.data.track_data, {
								pos_type : "pnear",
								pos_value : "pdetai_" + item.dealId,
								dealid : item.dealId,
								zid : item.productId,
								model_id : item.tno
							}));
							var url = $.zheui.domain + "/group/detail" + $.zheui.urlSuffix + "?tno=" + item.tno + "&pub_page_from=" + _this.data.pub_page_from + "&zid=" + prod_info.zid+"&nearby="+(item.tuanTotal - item.tuanNum);
							url = $.zheui.outDomain + "/jump?url=" + encodeURIComponent(url) + "&" + track_data_str;
							arr.push('<div class="row" data-url="' + url + '">');
							item.iconUrl = item.iconUrl ? (_this.data.isWebp ? item.iconUrl + '.webp' : item.iconUrl) : _filterUri("/img/pin.png");
							arr.push('	<img class="img" src="' + item.iconUrl + '" />');
							arr.push('	<div class="info">');
							arr.push('		<div class="fir">' + item.nickName + '</div>');
							arr.push('		<div class="sec">等你来拼~</div>');
							arr.push('	</div>');
							arr.push('	<div class="rig"><em class="go_order">去参团</em><i></i></div>');
							arr.push('	<div class="tim">');
							arr.push('		<div class="fir">还差' + (item.tuanTotal - item.tuanNum) + '人成团</div>');
							var closeTime = item.closeTime ? new Date(item.closeTime.replace(/\-/g, '/')).getTime() : 0;
							var str = "23:59:59";
							var cha = closeTime - ret.data.curTime;
							if (!isNaN(cha) && cha > 0) {
								str = time_str(cha);
							}
							arr.push('		<div class="sec js_time_dao" data-cha="' + cha + '">剩余' + str + '结束</div>');
							arr.push('	</div>');
							arr.push('</div>');
						});
						_this.dom.$order_in.append(arr.join(""));
						if (_this.data.isInviteNew == 1) {
							_this.data.$order_in.prev(".tit").html('以下小伙伴正在发起团购，折800新用户可直接参与');
						}
						$(".ordering").removeClass('hide');
						// 点击进入团详情
						$.zheui.bindTouchGoto($(".order_in .row"), function($this, ind) {
							T.jump_page($this.data("url"));
						});
						// 绑定倒计时事件
						setInterval(function() {
							$(".js_time_dao").each(function(ind, item) {
								var $item = $(item),
									cha = parseInt($item.data("cha"));
								cha -= 1000;
								if (cha < 0) {
									var $p = $item.parents(".row");
									$p.prev(".line").remove();
									$p.remove();
								} else {
									$item.attr("data-cha", cha).html("剩余" + time_str(cha) + "结束");
								}
							});
						}, 1000);

						function time_str(pa) {
							var h = pa / (1000 * 60 * 60);
							h = Math.floor(h);
							var m = (pa - h * 1000 * 60 * 60) / (1000 * 60);
							m = Math.floor(m);
							var s = (pa - h * 1000 * 60 * 60 - m * 1000 * 60) / 1000;
							s = Math.floor(s);
							return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
						}
					}
				});
			}
		},
		getMultiList: function() { //加载多拼团
			_this.dom.$pool_md.attr('is_geting', true);
			var cfg = _this.data,
				page = cfg.multi_cur_page;
			if (!cfg.multi_hasmore) {
				return;
			}
			var condition = {
				page: page,
				city_id: cfg.city_id,
				poolId: prod_info.multi_tuan,
				abandonZidList: cfg.zid,
				group_num: 0,
				only_saling: 1
			};
			if (cfg.tno) {
				condition.plan_end_from_now = "1";
			}
			T.proxy_getJSON("/nnc/list/group_deals.json", function(ret) {
				if (ret.status === 200) {
					if (page == 1) {
						if (ret.objects.length <= 0) {
							return $("div.pool_md").remove();
						} else {
							$.zheui.bindTouchGoto($("div.pool_more"), function($t, ind) {
								if (cfg.multi_cache) {
									renderMulti(cfg.multi_cache);
									cfg.multi_cache = null;
									// 加载更多移除
									if (!cfg.multi_hasmore) {
										$("div.pool_more").remove();
									}
								} else {
									_this.getMultiList();
								}
							});
						}
					}
					cfg.multi_cur_page += 1;
					cfg.multi_hasmore = ret.has_next;
					if (page === 1 && ret.objects && ret.objects.length > 3) {
						cfg.multi_cache = ret.objects.slice(3, 20);
						renderMulti(ret.objects.slice(0, 3));
					} else {
						renderMulti(ret.objects);
					}
					// 没有更多了 || 首次加载少于三个商品
					if (!(cfg.multi_hasmore || (page === 1 && ret.objects && ret.objects.length > 3))) {
						$("div.pool_more").remove();
					}
				}
			}, condition);

			function renderMulti(list) {
				var arr = [];
				$.each(list, function(ind, item) {
					var pro = item.product;
					if (pro) {
						if (cfg.tno) {
							pro.detail_url += ("&tno=" + cfg.tno);
						}
						arr.push('<li data-outjump=' + pro.detail_url + ' data-zid=' + pro.zid + ' data-dealid=' + pro.deal_id + '>');
						if (!cfg.tno) {
							arr.push('<div class="mg">');
						}
						var img_url = cfg.isWebp ? (pro.main_img + ".webp") : pro.main_img;
						arr.push('	<img class="img" src="' + img_url + '" />');
						arr.push('  <div class="rig">');
						arr.push('     <p class="til">' + pro.title + '</p>');
						arr.push('     <div class="pri"><em class="sm1">&yen;</em><em class="mai">' + pro.price + '</em><em class="sm2">/件</em><em class="org">' + pro.shop_price + '</em></div>');
						arr.push('     <div class="btn">');
						arr.push('         <span class="shen">拼团多省' + T.float_accSub(pro.shop_price, pro.price) + '元</span>');
						arr.push('         <button>马上参团</button>');
						arr.push('     </div>');
						arr.push('  </div>');
						if (!cfg.tno) {
							arr.push('</div>');
						}
						arr.push('</li>');
					}
				});
				if (arr.length) {
					_this.dom.$pool_md.find('ul').append(arr.join(""));
				}
			}
		},
		getRecommendProducts: function() { //获取推荐的商品
			_this.dom.$rcList.attr('is_geting', true);
			T.get_userid(function(id) {
				var param = {
					zid : _this.data.zid,
					city_id:_this.data.city_id,
					key2 : $.cookie.get("pintuan_device_id") || $.cookie.get("session_id"),
					key1: id?base64str.encodeBase64(base64str.utf16to8(id)):''
				};
				T.proxy_getJSON("/nnc/products/" + param.zid + "/recommend.json", function(ret) {
					if (ret.status === 200 && ret.results) {
						$('.recommend').removeClass('hide');
						var deals = ret.results.activityDealInfoList;
						if (deals && deals.length > 0) {
							var tpl = '';
							$.each(deals, function(ind, item) {
								var url = $.zheui.domain + '/detail/detail.html?zid=' + item.id + '&page_from=list&pub_page_from=' + _this.data.pub_page_from;
								_this.data.track_data.listversion = item.static_key.listversion;
								tpl += '<li data-outjump="' + url + '" data-zid="' + item.id + '" data-dealid="' + item.promotionId + '" data-listversion="' + item.static_key.listversion +'" ><div class="mg">';
								item.pinImgUrl = _this.data.isWebp ? item.pinImgUrl + '.webp' : item.pinImgUrl;
								tpl += '  <img data-url="' + item.pinImgUrl + '" src="' + _filterUri("/img/replace.png") + '" />';
								tpl += '  <p class="txt">' + (item.showTitle || '来抢') + '</p>';
								tpl += '  <p class="price">&yen;' + item.price + '</p>';
								tpl += '</div></li>';
							});
							_this.dom.$rcList.html(tpl).find("img").on('error', function() {
								this.setAttribute('src', _filterUri("/img/replace.png"));
							}).picLazyLoad({ //商品图懒加载
								threshold: 600
							});
							_this.event.exposure.exposure_ev('.rc-list', "li", _this.data.track_data, 3); //商品曝光统计
						}
					} else {
						_this.dom.$rcList.removeAttr('is_geting');
					}
				}, param);
			});
		},
		getDetailPicTxt: function(callback) { //获取图文详情
			_this.dom.$js_detail.attr('is_geting', true);
			T.proxy_getJSON("/nnc/product/detail_content.json?zid=" + _this.data.zid, function(ret) {
				if (ret.status == 200) {
					var pictxt = require("./detail_pictxt");
					pictxt.pictxtShow("div.show_info", ret.data);
					!_this.data.is_client && pictxt.pictxtShow("div.show_info_tab", ret.data);
					if (callback) {
						setTimeout(function() {
							callback();
						}, 100);
					}
				} else {
					_this.dom.$js_detail.removeAttr('is_geting');
				}
			});
		},
		getRealProdAfterEvent: function() { //获取商品实时数据后绑定事件

			//渲染sku
			// $.zheui.bindTouchGoto($("#selectsku"), function(obj) {
			// 	if (_this.data.tno) { //参团
			// 		_this.showSelectSku("buyNow");
			// 	} else { //开团
			// 		_this.showSelectSku("buyGroup");
			// 	}
			// }, false);

			$.zheui.bindTouchGoto($(".skubox_bg"), function(obj) {
				_this.event.selectSku.hide();
			});

			/*附近团进来的直接弹出sku*/
			if(_this.data.tno&&_this.data.nearby){
				// _this.showSelectSku("buyNow");
				_this.buyBtnClick("buyNow");
			}

			$.zheui.bindTouchGoto($(".skubox_bg"), function(obj) {
				_this.event.selectSku.hide();
			});
		},
		getRealProdAfterUpdate: function(realInfo) { //获取商品实时数据后修改页面部分数据
			var sales = document.getElementById('sales'),
				pin_status = _this.data.realInfo.pin_status;
			if (sales) { //修改销量
				var sales_count = realInfo.sales || 0;
				if (sales_count == 0) {
					sales.innerHTML = "新品上线";
				} else {
					if (prod_info.isInviteNew == 1 || prod_info.activity_type == 1) { // 邀新团或抽奖团显示真实销量
						sales.innerHTML = "已售" + sales_count + "件";
					} else {
						sales.innerHTML = "已售" + (sales_count * 6) + "件";
					}
				}
			}
			//修改购买按钮状态
			var $go_buy = $('.go-buy'),
				tpl = '';
			$go_buy.html('');
			if (_this.data.tno) { //参团
				var nowClass = pin_status != 2 ? 'tuan_now nowbuy_disable' : 'tuan_now';
				tpl += '<div class=' + nowClass + ' id="buyNow" data-tuan_flag="1" data-actionid="groupbuy">&yen;';
				tpl += '	<span class="fir"><em class="p">' + T.float_accSub(prod_info.cur_price, prod_info.subsidyPrice) + '</em>/件</span>';
				tpl += '	<span class="sec">立即参团</span>';
				tpl += '</div>';
			} else {
				if (pin_status == 2) {
					tpl += '<div class="tip js_tuan_tip">';
					if (prod_info.isInviteNew == 1) {
						tpl += '支付并邀请' + prod_info.peopleLack + '位折800新用户参加，人数不足自动退款';
					} else {
						tpl += '开团成功支付并邀请<span class="red">' + prod_info.peopleLack + '人</span>参加，人数不足自动退款';
					}
					tpl += '</div>';
					if (!product.coupon_goods) {
						tpl += '<div class="buybtn single_btn" id="buySingle" data-tuan_flag="0" data-actionid="singlebuy">&yen;&nbsp;';
						tpl += '	<em class="price">' + prod_info.cur_price + '</em>';
						tpl += '	<span class="count">单独购买</span>';
						tpl += '</div>';
					}
					tpl += '<div class="buybtn group_btn" id="buyGroup" data-tuan_flag="1" data-actionid="groupbuy">&yen;&nbsp;';
					tpl += '	<em class="price">' + T.float_accSub(prod_info.cur_price, prod_info.subsidyPrice) + '</em>';
					tpl += '	<span class="count">';
					if (product.coupon_goods) {
						tpl += '	秒杀';
					} else if (prod_info.isInviteNew == 1) {
						tpl += '	邀新价购买';
					} else {
						tpl += '	拼团购买';
					}
					tpl += '	</span>';
					tpl += '</div>';
				} else {
					tpl += '<div class="goIndexBtn">去首页逛逛吧</div>';
				}
			}
			$go_buy.append(tpl);
			_this.initBuyBtn();
			//打标
			$('div.mark').remove();
			if (pin_status != 2) {
				tpl = '<div class="mark">';
				if (pin_status == 1) {
					tpl += '即将开始';
				} else {
					tpl += '已抢光';
				}
				tpl += '</div>';
				_this.dom.$bannerImgs.append(tpl);
			}
		},
		setHeadPrice: function() { //设置团长免单优惠价格
			var $buyGroup = $('#buyGroup'),
				$tuan_pri = $(".tuan_pri"),
				headFree = this.data.headFree;
			this.data.is_head_free = 1;
			if (this.event.selectSku) {
				this.event.selectSku.headyouhui = this.data.headyouhui = T.toFixed(headFree.couponPrice); //select_sku.js中选择不同sku修改价格使用
			}
			headFree.head_free_price = T.toFixed(prod_info.pin_price - headFree.couponPrice);
			$buyGroup.find('.count').html('团长价购买'); //修改组团购买按钮的文案和价格
			$buyGroup.find('.price').html(headFree.head_free_price);
			var arr = (headFree.head_free_price + "").split(".");
			$tuan_pri.find('em.i').html(arr[0]); //修改商品图下面的价格
			if (arr[1]) {
				$tuan_pri.find('em.f').html("." + arr[1]);
			} else {
				$tuan_pri.find('em.f').html("");
			}
			$('.mark-ls').html('拼团多省' + T.float_accSub(prod_info.cur_price, headFree.head_free_price) + '元');
		},
		initSelectSku: function() { //初始化sku
			_this.event.selectSku = require('../detail/select_sku');
			_this.event.selectSku.init({
				title: prod_info.title,
				main_image: prod_info.shop_images[0].replace(".700x.", ".120x120.") + ".webp",
				pin_price: T.float_accSub(prod_info.cur_price, prod_info.subsidyPrice),
				cur_price: prod_info.cur_price,
				stockInfo: prod_info.sku,
				stockCount: _this.data.realInfo.product_sku,
				pin_status: _this.data.realInfo.pin_status,
				size_attributes: prod_info.attributes,
				sku_num: $.zheui.getUrlKeyVal('sku_num') || ''
			});
		},
		showSelectSku: function(id) { //sku点击事件
			var str = '拼团购买';
			var nearby = _this.data.nearby;
			if (id == 'buyGroup' || id == 'buyNow') {
				str = (id == 'buyGroup') ? '去开团' : (nearby && nearby==1?'一键成团 >':'马上参团 >');
				_this.event.selectSku.is_pin = true;
				_this.event.selectSku.headyouhui = _this.data.headyouhui;
			} else { //单独购买没有优惠
				str = '单独购买';
				_this.event.selectSku.is_pin = false;
				_this.event.selectSku.headyouhui = null;
			}
			_this.event.selectSku.setSureBtnTxt(str); //设置购买按钮文案
			_this.event.selectSku.sureBtn = $('#' + id); //sku弹窗中的购买按钮
			_this.event.selectSku.setSkuConfig();
			_this.event.selectSku.show();
		},
		buyBtnClick: function(id) { //单独购买、组团购买、立即购买
			if ((prod_info.buy_plat === 1 || _this.data.is_weibo) && id != 'single' && !_this.data.is_client) { //app专享
				_this.getPass(function(pass) {
					if (_this.dom.$skubox.hasClass("skubox_show")) {
						_this.event.selectSku.hide();
					}
					if (!_this.event.myDialog) {
						var dialog = require('../common/dialog');
						_this.event.myDialog = new dialog();
					}
					_this.event.myDialog.create(2, "<div class='appVipTip'><i class='icon_close sprite'></i><h5><i></i></h5><div class='cont'><p class='fir'>第1步：长按完整复制以下专享码</p><p class='sec'>第2步：去折800客户端直接参团</p><p class='vipCode'>" + pass + "</p><p class='git'>操作示例</p><p class='gi'><img src='" + window._filterUri("/img/appcode.gif") + "' width='219'></p><button class='btn'>马上拼团</button></div></div>");
					$(".appVipTip").parents(".dialog_box").addClass("dialog_box_code");
					$.zheui.bindTouchGoto($(".appVipTip .icon_close,.bg_layer"), function() {
						_this.event.myDialog.hide();
					});
					$.zheui.bindTouchGoto($(".appVipTip .btn"), function() {
						window.location.href = 'http://' + T.domain.t + '/YbMn6bAJNZny';
					});
				});
				return;
			}
			if (prod_info.times > 0 && _this.data.realInfo.limit_times >= prod_info.times) {
				return $.zheui.toast("您已超过购买限制");
			}
			var sku_box = _this.event.selectSku;
			if (sku_box) { //有真sku
				//排除假sku
				if (sku_box.sku.img_list.length > 1 || sku_box.sku.size_list.length >1) {
					if (!_this.dom.$skubox.hasClass("skubox_show")) { //未显示选择sku弹窗
						return _this.showSelectSku(id);
					}
					if (!_this.event.selectSku.selected) {
						return $.zheui.toast("请先选择再购买哦~");
					}
				} else {
					var pvid = '';
					if (sku_box.sku.img_list.length == 1 && sku_box.sku.size_list.length == 1) {  //有颜色和尺码
						pvid = sku_box.sku.img_list[0].pId + '-' + sku_box.sku.img_list[0].vId + ':' + sku_box.sku.size_list[0].pId + '-' + sku_box.sku.size_list[0].vId;
					} else if (sku_box.sku.img_list.length == 1) { //只有颜色
						pvid = sku_box.sku.img_list[0].pId + '-' + sku_box.sku.img_list[0].vId;
					} else if (sku_box.sku.size_list.length == 1) {  //只有尺码
						pvid = sku_box.sku.size_list[0].pId + '-' + sku_box.sku.size_list[0].vId;
					};
					 _this.event.selectSku.selected = _this.event.selectSku.sku.sku_map[pvid];
				}
			}
			var $buy = $('#' + id),
				tuan_flag = $buy.data('tuan_flag'),
				headFree = this.data.headFree,
				selectedSku = _this.event.selectSku ? _this.event.selectSku.selected : null,
				sku_price = selectedSku ? selectedSku.sku_price : 0;
			if (id == "buyNow" && $buy.hasClass('nowbuy_disable')) return; //立即购买按钮
			$.tracklog.action($buy.data('actionid')); //0像素打点统计
			var params = 'zid=' + _this.data.zid;
			params += '&tno=' + _this.data.tno;
			params += '&tuan_flag=' + tuan_flag; //1:是组团买, 0:单独买
			if (tuan_flag == 1 && _this.data.is_head_free == 1) { //组团购买&团长特惠
				params += '&is_head_free=' + _this.data.is_head_free;
			}
			if (selectedSku) { //商品有sku
				params += '&sku_num=' + encodeURIComponent(selectedSku.sku);
			}
			if (_this.event.selectSku) {
				params += '&buy_count=' + (_this.event.selectSku ? _this.event.selectSku.buy_count : 1);
			}
			if (id) {
				params += '&event_id=' + id;
			}
			// var url = "http://" + T.domain.pina_m + "/detailorder/confirmorder" + $.zheui.urlSuffix + "?" + params;
			var url = "http://" + T.domain.pina_m + "/detailorder/detailorder" + $.zheui.urlSuffix + "?" + params;
			if (_this.data.is_weixin || _this.data.is_qq) {
				url = $.zheui.get_openid(url);
			}
			if (!_this.data.islogin) { //未登录
				return T.to_login(url);
			}
			T.jump_page(url);
		},
		getPass: function(callback) { //获取app专享口令
			if (_this.data.data_pass) {
				return callback(_this.data.data_pass);
			}
			var url = $.zheui.domain + "/detail/detail.html?zid=" + _this.data.zid + '&tno=' + _this.data.tno;
			var posv = "0",
				utm_csr = $.cookie.get("utm_csr") || "",
				out_url = $.zheui.outDomain + '/jump?url=' + encodeURIComponent(url) + "&pos_type=taokl&pos_value=" + posv + "&dealId=" + prod_info.dealid + "&zid=" + _this.data.zid + "&jump_source=2&refer=" + utm_csr;
			if (prod_info.activity_type === 1) { // 抽奖团
				posv = "1";
			} else if (prod_info.isInviteNew === 1) { // 邀新团
				posv = "3";
			} else if (_this.data.is_head_free === 1) { // 团长特惠
				posv = "2";
			} else if (prod_info.buy_plat === 1) { // app专享
				posv = "4";
			}
			posv = "taokl_" + posv;
			if (prod_info.multi_tuan) {
				posv += "_duopin";
			} else {
				posv += "_normal";
			}
			$.post('/j/wireless/rest/kouling/create', {
				activity_name: prod_info.title || '客户端专享团',
				url: out_url,
				refer: utm_csr,
				expire: 7 * 24 * 3600
			}, function(ret) {
				if (ret && ret.encode_result) {
					_this.data.data_pass = ret.encode_result;
					callback(ret.encode_result);
				}
			});
		},
		pvuvStatistics: function(pos_type, pos_value, model_name, model_item_index, model_id, model_index, visit_type) { //pv、uv统计（页面流转统计）
			var _this = this;
			var track_data = $.extend({}, _this.data.track_data);
			if (_this.data.is_client) {
				track_data.pos_type = pos_type;
				track_data.pos_value = pos_value;
				track_data.model_name = model_name;
				track_data.model_item_index = model_item_index;
				track_data.model_id = model_id;
				track_data.model_index = model_index;
				track_data.visit_type = visit_type;
				$.common.tracklogs(track_data);
			}
		}
	}
	var _this = new detail();
	_this.init();
});
