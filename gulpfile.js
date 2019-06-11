'use strict';
const dirs = {
	source: 'src', // папка с исходниками (путь от корня проекта)
	build: 'build' // папка с результатом работы (путь от корня проекта)
};

// Определим необходимые инструменты
const gulp = require('gulp');
const sass = require('gulp-sass');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const replace = require('gulp-replace');
const del = require('del');
const browserSync = require('browser-sync').create();
const newer = require('gulp-newer');
const imagemin = require('gulp-imagemin');
const pngquant = require('imagemin-pngquant');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const cleanCSS = require('gulp-cleancss');
const include = require('gulp-file-include'); //include
const htmlbeautify = require('gulp-html-beautify');

// ЗАДАЧА: Компиляция препроцессора
gulp.task('sass', function() {
	return gulp
		.src(dirs.source + '/sass/style.scss') // какой файл компилировать (путь из константы)
		.pipe(include())
		.pipe(plumber({ errorHandler: onError }))
		.pipe(sourcemaps.init()) // инициируем карту кода
		.pipe(sass()) // компилируем
		.pipe(
			postcss([
				// делаем постпроцессинг
				autoprefixer({
					browsers: [
						'last 2 version',
						'last 7 Chrome versions',
						'last 10 Opera versions',
						'last 7 Firefox versions'
					]
				}), // автопрефиксирование
				mqpacker({ sort: true }) // объединение медиавыражений
			])
		)
		.pipe(sourcemaps.write('/')) // записываем карту кода как отдельный файл (путь из константы)
		.pipe(gulp.dest(dirs.build + '/css/')) // записываем CSS-файл (путь из константы)
		.pipe(browserSync.stream())
		.pipe(rename('style.min.css')) // переименовываем
		.pipe(cleanCSS()) // сжимаем
		.pipe(gulp.dest(dirs.build + '/css/')); // записываем CSS-файл (путь из константы)
});

// ЗАДАЧА: Сборка HTML
gulp.task('html', function() {
	return gulp
		.src(dirs.source + '/*.html') // какие файлы обрабатывать (путь из константы, маска имени)
		.pipe(include())
		.pipe(htmlbeautify())
		.pipe(plumber({ errorHandler: onError }))
		.pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, '')) // убираем комментарии <!--DEV ... -->
		.pipe(gulp.dest(dirs.build)); // записываем файлы (путь из константы)
});

// ЗАДАЧА: Копирование изображений
gulp.task('img', function() {
	return gulp
		.src(
			[
				dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}' // какие файлы обрабатывать (путь из константы, маска имени, много расширений)
			],
			{ since: gulp.lastRun('img') } // оставим в потоке обработки только изменившиеся от последнего запуска задачи (в этой сессии) файлы
		)
		.pipe(plumber({ errorHandler: onError }))
		.pipe(newer(dirs.build + '/img')) // оставить в потоке только новые файлы (сравниваем с содержимым папки билда)
		.pipe(gulp.dest(dirs.build + '/img')); // записываем файлы (путь из константы)
});

// ЗАДАЧА: Оптимизация изображений (ЗАДАЧА ЗАПУСКАЕТСЯ ТОЛЬКО ВРУЧНУЮ)
gulp.task('img:opt', function() {
	return gulp
		.src([
			dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}', // какие файлы обрабатывать (путь из константы, маска имени, много расширений)
			'!' + dirs.source + '/img/sprite-svg.svg' // SVG-спрайт брать в обработку не будем
		])
		.pipe(plumber({ errorHandler: onError }))
		.pipe(
			imagemin({
				// оптимизируем
				progressive: true,
				svgoPlugins: [ { removeViewBox: false } ],
				use: [ pngquant() ]
			})
		)
		.pipe(gulp.dest(dirs.source + '/img')); // записываем файлы в исходную папку
});

// ЗАДАЧА: Очистка папки сборки
gulp.task('clean', function() {
	return del([
		// стираем
		dirs.build + '/**/*', // все файлы из папки сборки (путь из константы)
		'!' + dirs.build + '/readme.md' // кроме readme.md (путь из константы)
	]);
});

// ЗАДАЧА: Конкатенация и углификация Javascript
gulp.task('js', function() {
	return gulp
		.src([
			// список обрабатываемых файлов в нужной последовательности (Запятая после каждого файла, в конце запятая не нужна)
			dirs.source + '/js/script.js'
		])
		.pipe(include()) //Прогоним через include-file
		.pipe(plumber({ errorHandler: onError }))
		.pipe(concat('script.js'))
		.pipe(gulp.dest(dirs.build + '/js'))
		.pipe(rename('script-min.js'))
		.pipe(uglify())
		.pipe(gulp.dest(dirs.build + '/js'))
		.pipe(browserSync.stream());
});

// ЗАДАЧА: Перемещение шрифтов
gulp.task('copy', function() {
	return gulp.src(dirs.source + '/fonts/**/*.{woff,woff2}').pipe(gulp.dest('build' + '/fonts'));
});

// ЗАДАЧА: Сборка всего
gulp.task(
	'build',
	gulp.series(
		// последовательно:
		'clean', // последовательно: очистку папки сборки
		gulp.parallel('sass', 'img', 'js', 'copy'),
    'html'  // последовательно: сборку разметки
	)
);

// ЗАДАЧА: Локальный сервер, слежение
gulp.task(
	'serve',
	gulp.series('build', function() {
		browserSync.init({
			// запускаем локальный сервер (показ, автообновление, синхронизацию)
			//server: dirs.build,                                     // папка, которая будет «корнем» сервера (путь из константы)
			server: {
				baseDir: './build/'
			},
			port: 3010, // порт, на котором будет работать сервер
			startPath: 'index.html' // файл, который буде открываться в браузере при старте сервера
			// open: false                                          // возможно, каждый раз стартовать сервер не нужно...
		});

		gulp.watch(
			// следим за HTML
			[
				dirs.source + '/**/*.html' // в папке с исходниками
			],
			gulp.series('html', reloader) // при изменении файлов запускаем пересборку HTML и обновление в браузере
		);

		gulp.watch(
			// следим
			dirs.source + '/sass/**/*.scss',
			gulp.series('sass') // при изменении запускаем компиляцию (обновление браузера — в задаче компиляции)
		);

		gulp.watch(
			// следим за изображениями
			dirs.source + '/img/*.{gif,png,jpg,jpeg,svg}',
			gulp.series('img', reloader) // при изменении оптимизируем, копируем и обновляем в браузере
		);

		gulp.watch(
			// следим за JS
			dirs.source + '/js/**/*.js',
			gulp.series('js', reloader) // при изменении пересобираем и обновляем в браузере
		);
	})
);

// ЗАДАЧА: Задача по умолчанию
gulp.task('default', gulp.series('serve'));

// Дополнительная функция для перезагрузки в браузере
function reloader(done) {
	browserSync.reload();
	done();
}

// Проверка существования файла/папки
function fileExist(path) {
	const fs = require('fs');
	try {
		fs.statSync(path);
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}

var onError = function(err) {
	notify.onError({
		title: 'Error in ' + err.plugin
	})(err);
	this.emit('end');
};
