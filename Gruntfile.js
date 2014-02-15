'use strict';

var MergeBuildPropertiesClass = require('./build/MergeBuildProperties');
var propertyMerger = new MergeBuildPropertiesClass('buildDefaultProperties.json', 'buildProperties.json');

// LOAD AND MERGE BUILD PROPERTIES
var buildProperties = propertyMerger.merge();

module.exports = function (grunt) {
    // show elapsed time at the end
    require('time-grunt')(grunt);
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        // package info
        pkg: grunt.file.readJSON('package.json'),
        // build properties("buildDefaultProperties.json" merged with "buildProperties.json")
        buildProperties: buildProperties,

        watch: {
            src: {
                files: ['<%= buildProperties.src %>/**/*'],
                tasks: ['deploy']
            }
        },
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '<%= buildProperties.dist %>'
                    ]
                }]
            },
            tmp: '.tmp'
        },
        // Put files not handled in other tasks here
        copy: {
            package: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= buildProperties.src %>/package',
                    dest: '<%= buildProperties.dist %>',
                    src: '**/*'
                }]
            },
            app: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= buildProperties.src %>/app',
                    dest: '<%= buildProperties.dist %>/EmberChat.app',
                    src: '**/*'
                }]
            },
            nwapp: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= buildProperties.dist %>',
                    dest: '<%= buildProperties.dist %>/EmberChat.app/Contents/Resources',
                    src: 'app.nw'
                }]
            },
            webapp: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= buildProperties.webapp %>',
                    dest: '<%= buildProperties.dist %>',
                    src: '**/*'
                }]
            }
        },
        shell: {
            cpAppSkeleton: {
                command: 'cp -r <%= buildProperties.nodeWebKit.dir %>/<%= buildProperties.nodeWebKit.appName %> dist/EmberChat.app'
            },
            // unzip webkit by cmd cause grunt unzip is really slow
            unzipNodeWebkit: {
                command: 'unzip .tmp/node-webkit.zip -d <%= buildProperties.nodeWebKit.dir %>'
            }
        },
        curl: {
            // downloads the app
            app: {
                src: '<%= buildProperties.webappDistUrl %>',
                dest: '.tmp/appdist.zip'
            },
            nodeWebkit: {
                src: '<%= buildProperties.nodeWebKit.skeletonUrl %>',
                dest: '.tmp/node-webkit.zip'
            }
        },
        unzip: {
            // unzips downloaded app dist package into dist
            appdist: {
                src: '.tmp/appdist.zip',
                dest: '<%= buildProperties.dist %>',
                router: function (filepath) {
                    // remove directory
                    return filepath.replace(buildProperties.webappDistDir + '/', '');
                }
            }
        },
        zip: {
            app: {
                cwd: '<%= buildProperties.dist %>/',
                src: ['<%= buildProperties.dist %>/**/*'],
                dest: '<%= buildProperties.dist %>/app.nw'
            }
        }
    });

    /**
     * Copy the webapp from set directory, if not found loads last build from github
     */
    grunt.registerTask('requireApp', function(target) {
        var fs = require('fs');
        if (fs.existsSync(buildProperties.webapp)) {
            console.log('Got app from ' + buildProperties.webapp);
            grunt.task.run('copy:webapp');
        }else{
            console.info('App not found under: ' + buildProperties.webapp);
            console.info('You should specify the path to the app dist');
            console.info('Create a build/buildProperties.json and define the app dir.');
            console.info('Look into the buildDefaultProperties.json for help.');
            console.log('Fallback: Load app from ' + buildProperties.webappDistUrl);
            grunt.task.run(['curl:app', 'unzip:appdist', 'clean:tmp']);
        }
    });

    /**
     * Copy the webapp from set directory, if not found loads last build from github
     */
    grunt.registerTask('requireNodeWebkit', function(target) {
        var fs = require('fs');
        if (fs.existsSync(buildProperties.nodeWebKit.dir)) {
            console.log('Got node-webkit from local copy: ./' + buildProperties.nodeWebKit.dir);
        }else{
            console.info('node-webkit not found under: ./' + buildProperties.nodeWebKit.dir);
            console.info('You should specify the path to the app dist');
            console.info('Create a build/buildProperties.json and define the app dir.');
            console.info('Look into the buildDefaultProperties.json for help.');
            console.log('Fallback: Load app from ' + buildProperties.nodeWebKit.skeletonUrl);
            grunt.task.run(['curl:nodeWebkit', 'shell:unzipNodeWebkit', 'clean:tmp']);
        }
    });

    grunt.registerTask('server', function (target) {
        grunt.task.run([
            'build',
            'watch'
        ]);
    });

    grunt.registerTask('build', [
        'clean:dist',
        'copy:package',
        'requireApp',
        'zip:app',
        'requireNodeWebkit',
        'shell:cpAppSkeleton',
        'copy:nwapp',
        'copy:app'
    ]);

    grunt.registerTask('default', [
        'build'
    ]);
};
