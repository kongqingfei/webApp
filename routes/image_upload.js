var formidable = require('formidable'),
    http = require('http'),
    util = require('util');
let fs = require('fs');

http.createServer(function(req, res) {
  if (req.url == '/testupload' && req.method.toLowerCase() == 'post') {
    // parse a file upload
    var form = new formidable.IncomingForm();
    form.uploadDir = "upload";

    form.parse(req, function(err, fields, files) {
      res.writeHead(200, {'content-type': 'text/plain'});
      res.write('received upload:\n\n');
      // 接收文件，保存本地
      console.log("parsing done");
		var types = files.uploadFile.name.split('.'); //将文件名以.分隔，取得数组最后一项作为文件后缀名。
		console.log(types);
		var date = new Date();
	    var ms = Date.parse(date); //计算当前时间与1970年1月1日午夜相差的毫秒数 赋值给ms以确保文件名无重复。
	    fs.renameSync(files.uploadFile.path, "upload/files" + ms +"." + String(types[types.length-1]));
      res.end(util.inspect({fields: fields, files: files}));
    });

    return;
  }

  // show a file upload form
  res.writeHead(200, {'content-type': 'text/html'});
  res.end(
    '<form action="/testupload" enctype="multipart/form-data" method="post">'+
    '<input type="text" name="title"><br>'+
    '<input type="file" name="uploadFile" multiple="multiple"><br>'+
    '<input type="submit" value="Upload">'+
    '</form>'
  );
}).listen(8080);