module.exports = function (grunt) {

  var dest_dist = 'dist/';
  var dest_assets = 'dist/assets/';
  var dest_views = '.views/';

  // Project configuration.
  grunt.initConfig({

    pkg : grunt.file.readJSON('package.json'),

    clean : {
      dist : {force : true, src : dest_dist},
      hbs : {force : true, src : dest_views}
    },

    copy : {
      assets : {
        expand : true,
        cwd : 'public/',
        src : ['**/*.{js,css,gif,jpg,png,swf,jpeg,cur}'],
        dest : dest_assets
      },
      hbs : {
        expand : true,
        cwd : 'app/views/',
        src : ['**/*.hbs'],
        dest : dest_views
      }
    },

    filerev : {
      options : {
        algorithm : 'md5',
        length : 8
      },
      assets : {
        expand : true,
        cwd : dest_assets,
        src : ['**/*'],
        dest : dest_assets
      }
    },

    // md5文件映射
    sourcemap : {
      options : {
        mapPath : dest_assets + '/map.json',
        exportMap : true,
        assetsDir : dest_assets
      },
      dist : {
        src : 'dist/assets/{css,img,js}/**/*.{js,css,jpeg,jpg,gif,png}'
      }
    },

    filter : {
      options : {
        mapPath : 'http://i4.tuanimg.com/my/map.json',
        baseUrl : "//i4.tuanimg.com/pin/",
        viewsDir : '.views/',
        config : './views/layouts/default.hbs'
      },
      assets : {
        src: 'dist/assets/**/*.{css,js}'
      },
      hbs : {
        src: '.views/**/*.hbs'
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'build/<%= pkg.name %>.min.js'
      }
    }
  });

  // Load tasks
  require('load-grunt-tasks')(grunt);

  // 静态资源构建任务
  grunt.registerTask('default' , [
    'clean',
    'copy:assets',
    'filerev:assets',
    'sourcemap',
    'filter:assets'
  ]);

  // 模板构建任务
  grunt.registerTask('view', [
    'clean:hbs',
    'copy:hbs',
    'filter:hbs'
  ])

};