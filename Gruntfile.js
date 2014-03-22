'use strict';

var nodeWebKitVersion = '0.9.2';

var MergeBuildPropertiesClass = require('./build/MergeBuildProperties');
var propertyMerger = new MergeBuildPropertiesClass('buildDefaultProperties.json', 'buildProperties.json');

// LOAD AND MERGE BUILD PROPERTIES
var buildProperties = propertyMerger.merge();

var applicationScripts = [
    "libs/nw-desktop-notifications.js",
    "backside.js"
];
for(var i=0; i<applicationScripts.length; i++){
    applicationScripts[i] = '<script src="' + applicationScripts[i] + '"></script>'
}
applicationScripts = applicationScripts.join('\n');


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
        nodeWebKitVersion: nodeWebKitVersion,

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
            tmp: '.tmp',
            macRelease: {
                files: [{
                    dot: true,
                    src: [
                        '<%= buildProperties.releaseTargetDir %>/mac/<%= buildProperties.macOsAppName %>/Contents/Resources/Credits.html'
                    ]
                }]
            }
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
            macAppAdjustments: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= buildProperties.src %>/app',
                    dest: '<%= buildProperties.releaseTargetDir %>/mac/<%= buildProperties.macOsAppName %>',
                    src: '**/*'
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
            packMacVersion: {
                command: 'zip -r ../../../EmberChat.MacOS-<%= pkg.version %>.zip <%= buildProperties.macOsAppName %>',
                options: {
                    execOptions: {
                        cwd: '<%= buildProperties.releaseTargetDir %>/mac'
                    }
                }
            },
            packLinux64Version: {
                command: 'zip -r ../../../EmberChat.Linux64-<%= pkg.version %>.zip EmberChat',
                options: {
                    execOptions: {
                        cwd: '<%= buildProperties.releaseTargetDir %>/linux64'
                    }
                }
            },
            packWindowsVersion: {
                command: 'zip -r ../../../EmberChat.Windows-<%= pkg.version %>.zip EmberChat',
                options: {
                    execOptions: {
                        cwd: '<%= buildProperties.releaseTargetDir %>/win'
                    }
                }
            }
        },
        curl: {
            // downloads the app
            app: {
                src: '<%= buildProperties.webappDistUrl %>',
                dest: '.tmp/appdist.zip'
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
        replace: {
            libs: {
                options: {
                    patterns: [
                        {
                            match: '/<!---NativeApplicationLibs--->/g',
                            replacement: applicationScripts,
                            expression: true
                        }
                    ]
                },
                files: [
                    {src: '<%= buildProperties.dist %>/index.html', dest: '<%= buildProperties.dist %>/index.html'}
                ]
            },
            version: {
                options: {
                    patterns: [
                        {
                            match: '/@@@package_version/g',
                            replacement: '<%= pkg.version %>',
                            expression: true
                        }
                    ]
                },
                files: [
                    {src: '<%= buildProperties.dist %>/package.json', dest: '<%= buildProperties.dist %>/package.json'},
                    {
                        src: '<%= buildProperties.releaseTargetDir %>/mac/<%= buildProperties.macOsAppName %>/Contents/Info.plist',
                        dest: '<%= buildProperties.releaseTargetDir %>/mac/<%= buildProperties.macOsAppName %>/Contents/Info.plist'
                    }
                ]
            }
        },
        nodewebkit: {
            options: {
                version: '<%= nodeWebKitVersion %>',
                build_dir: './webkitbuilds', // Where the build version of my node-webkit app is saved
                mac: true, // We want to build it for mac
                win: true, // We want to build it for win
                linux32: false, // We don't need linux32
                linux64: true // We don't need linux64
            },
            src: ['./dist/**/*'] // Your node-wekit app
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

    grunt.registerTask('server', function (target) {
        grunt.task.run([
            'build',
            'watch'
        ]);
    });

    grunt.registerTask('makeVersion', [
        'build',
        'shell:packMacVersion',
        'shell:packLinux64Version',
        'shell:packWindowsVersion'
    ]);

    grunt.registerTask('MacOSAdjustments', [
        'copy:macAppAdjustments',
        'replace:version',
        'clean:macRelease'
    ]);

    grunt.registerTask('build', [
        'clean:dist',
        'copy:package',
        'requireApp',
        'replace:libs',
        'replace:version',
        'nodewebkit',
        'MacOSAdjustments'
    ]);

    grunt.registerTask('default', [
        'build'
    ]);
};
