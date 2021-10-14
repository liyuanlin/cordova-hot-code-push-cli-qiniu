(function() {
	var path = require('path'),
		prompt = require('prompt'),
		build = require('./build.js').execute,
		fs = require('fs'),
		Q = require('q'),
		_ = require('lodash'),
		readdirp = require('readdirp'),
		qiniu = require("qiniu"),
		loginFile = path.join(process.cwd(), '.chcplogin');

	module.exports = {
		execute: execute
	};

	function execute(context) {
		var executeDfd = Q.defer();

		build(context).then(function() {
			deploy(context).then(function() {
				executeDfd.resolve();
			});
		});

		return executeDfd.promise;
	}

	function deploy(context) {
		var executeDfd = Q.defer(),
			config,
			credentials,
			ignore = context.ignoredFiles;

		try {
			config = fs.readFileSync(context.defaultConfig, 'utf8');
			config = JSON.parse(config);
		} catch (e) {
			console.log('Cannot parse cordova-hcp.json. Did you run cordova-hcp init?');
			process.exit(0);
		}
		if (!config) {
			console.log('You need to run "cordova-hcp init" before you can run "cordova-hcp login".');
			console.log('Both commands needs to be invoked in the root of the project directory.');
			process.exit(0);
		}
		try {
			credentials = fs.readFileSync(loginFile, 'utf8');
			credentials = JSON.parse(credentials);
		} catch (e) {
			console.log('Cannot parse .chcplogin: ', e);
		}
		if (!credentials) {
			console.log('You need to run "cordova-hcp login" before you can run "cordova-hcp deploy".');
			process.exit(0);
		}

		ignore = ignore.filter(ignoredFile => !ignoredFile.match(/^chcp/))
		ignore = ignore.map(ignoredFile => `!${ignoredFile}`)

		// console.log('Credentials: ', credentials);
		// console.log('Config: ', config);
		// console.log('Ignore: ', ignore);

		const files = readdirp({
			root: context.sourceDirectory,
			fileFilter: ignore
		});

		//qiConfig.zone = qiniu.zone.Zone_z0;		
		var mac = new qiniu.auth.digest.Mac(credentials.key, credentials.secret);
		var qiConfig = new qiniu.conf.Config();
		files.on('data', (entry) => {
				//console.log(entry)
				const fullPath = entry.fullPath;
				var key = config.prefix + entry.path.replace(/\\/g,'/')
				var options = {
					scope: `${config.bucket}:${key}`
				};
				var putPolicy = new qiniu.rs.PutPolicy(options);
				var uploadToken = putPolicy.uploadToken(mac);
				var putExtra = new qiniu.form_up.PutExtra();
				var formUploader = new qiniu.form_up.FormUploader(qiConfig);
				// 文件上传
				formUploader.putFile(uploadToken, key, fullPath, putExtra, function(respErr,
					respBody, respInfo) {
					if (respErr) {
						throw respErr;
					}
					if (respInfo.statusCode == 200) {
						console.log(respBody);
					} else {
						console.log(respInfo.statusCode);
						console.log(respBody);
					}
				});
			})
			// Optionally call stream.destroy() in `warn()` in order to abort and cause 'close' to be emitted
			.on('warn', error => console.error('non-fatal error', error))
			.on('error', error => {
				console.error("unable to sync:", err);
				executeDfd.reject();
			})
			.on('end', () => {
				console.log("Deploy done");
				executeDfd.resolve();
			});




		formUploader.putStream(uploadToken, key, readableStream, putExtra, function(respErr,
			respBody, respInfo) {
			if (respErr) {
				throw respErr;
			}
			if (respInfo.statusCode == 200) {
				console.log(respBody);
			} else {
				console.log(respInfo.statusCode);
				console.log(respBody);
			}
		});
		files.pipe()

		return executeDfd.promise;
	}
})();
