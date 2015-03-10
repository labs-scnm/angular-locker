var gulp    = require('gulp'),
    prompt  = require('gulp-prompt'),
    semver  = require('semver'),
    streamqueue = require('streamqueue'),
    jeditor = require('gulp-json-editor'),
    package = require('./package.json');

var fizzy = require('fizzy');

var paths = {
    output : 'dist/',
    vendor: [
        'vendor/angular/angular.js',
        'vendor/angular-mocks/angular-mocks.js'
    ],
    scripts : [
        'src/angular-locker.js'
    ],
    test: [
        'test/mock/storageMock.js',
        'test/spec/**/*.js'
    ],
    versions: [
        './bower.json',
        './package.json'
    ],
    karma: 'test/karma.conf.js'
};

var banner = [
    '/*! ',
    '<%= package.name %> ',
    'v<%= package.version %> | ',
    '(c) ' + new Date().getFullYear() + ' <%= package.author %> |',
    ' <%= package.homepage %>',
    ' */',
    '\n'
].join('');

gulp.task('lint', fizzy('lint', {
    src: paths.scripts
}));

gulp.task('clean', fizzy('clean', {
    src: paths.output
}));

gulp.task('scripts', ['clean'], fizzy('scripts', {
    src: paths.scripts,
    dest: paths.output,
    header: [banner, { package: package }]
}));

gulp.task('test', fizzy('test', {
    src: paths.vendor.concat(paths.scripts, paths.test),
    karmaConfigFile: paths.karma
}));

gulp.task('gitdown', fizzy('gitdown', {
    src: '.gitdown/master.md',
    dest: 'README.md'
}));

gulp.task('default', ['lint', 'clean', 'scripts', 'test', 'gitdown']);

var promptBump = function(callback) {

    return gulp.src('')
        .pipe(prompt.prompt({
            type: 'list',
            name: 'bump',
            message: 'What type of version bump would you like to do ? (current version is ' + package.version + ')',
            choices: [
                'patch (' + package.version + ' --> ' + semver.inc(package.version, 'patch') + ')',
                'minor (' + package.version + ' --> ' + semver.inc(package.version, 'minor') + ')',
                'major (' + package.version + ' --> ' + semver.inc(package.version, 'major') + ')',
                'none (exit)'
            ]
        }, function(res) {
            var newVer;
            if(res.bump.match(/^patch/)) {
                newVer = semver.inc(package.version, 'patch');
            } else if(res.bump.match(/^minor/)) {
                newVer = semver.inc(package.version, 'minor');
            } else if(res.bump.match(/^major/)) {
                newVer = semver.inc(package.version, 'major');
            }
            if(newVer && typeof callback === 'function') {
                return callback(newVer);
            } else {
                return;
            }
        }));
};

gulp.task('release', ['default'], function () {
    return promptBump(function(newVer) {

            var stream = streamqueue({ objectMode: true });

            // make the changelog
            // stream.queue(makeChangelog(newVer));

            // update the main project version number
            stream.queue(
                gulp.src('./package.json')
                .pipe(jeditor({
                    'version': newVer
                }))
                .pipe(gulp.dest('./'))
            );

            stream.queue(
                gulp.src('./bower.json')
                .pipe(jeditor({
                    'version': newVer
                }))
                .pipe(gulp.dest('./'))
            );

            // stream.queue(build(newVer));

            return stream.done();
        });
});
