module.exports = function(grunt) {

  grunt.initConfig({
    clean: [ "dist" ],
    less: {
      dist: {
        options: {
          paths: [ "node_modules/bootstrap/less" ],
          compress: false,
          strictMath: true
        },
        files: {
          "stylesheets/dist/css/bootstrap.css": "stylesheets/less/bootstrap.less"
        }
      }
    },
    uglify: {
      bootstrap: {
        files: {
          "stylesheets/dist/js/bootstrap.min.js": [
            "node_modules/bootstrap/js/transition.js",
            "node_modules/bootstrap/js/alert.js",
            "node_modules/bootstrap/js/button.js",
            "node_modules/bootstrap/js/carousel.js",
            "node_modules/bootstrap/js/collapse.js",
            "node_modules/bootstrap/js/dropdown.js",
            "node_modules/bootstrap/js/modal.js",
            "node_modules/bootstrap/js/tooltip.js",
            "node_modules/bootstrap/js/popover.js",
            "node_modules/bootstrap/js/scrollspy.js",
            "node_modules/bootstrap/js/tab.js",
            "node_modules/bootstrap/js/affix.js"
          ]
        }
      }
    },
    copy: {
      jquery: {
        src: "node_modules/jquery/dist/jquery.min.js",
        dest: "stylesheets/dist/js/jquery.min.js"
      }
    },
    watch: {
      less: {
        files: [
          "less/*.less"
        ],
        tasks: [ "less:dist" ]
      }
    },
  });

  grunt.registerTask('compress', 'compress a generic css', function(fileSrc, fileDst) {
    const files = {};
    files[fileDst] = fileSrc;
    grunt.log.writeln('compressing file ' + fileSrc);

    grunt.config('less.dist.files', files);
    grunt.config('less.dist.options.compress', true);
    grunt.task.run(['less:dist']);
  });

  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-less");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-watch");
   
  grunt.registerTask("default", [
    "clean",
    "less:dist",
    "compress:stylesheets/dist/css/bootstrap.css:stylesheets/dist/css/bootstrap.min.css",
    "uglify",
    "copy"
  ]);

};
