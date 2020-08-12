const fs = require('fs');
const parser = require('@babel/parser');
const path = require('path');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');

const getModuleInfo = (file) => {
	// read entry file
	const body = fs.readFileSync(file, 'utf-8');

	// get ast
	const ast = parser.parse(body, {
		sourceType: 'module', // es module
	});
	console.log(ast.program.body);

	// collect import dependency
	const deps = {};
	traverse(ast, {
		ImportDeclaration({ node }) {
			const dirname = path.dirname(file);
			const abspath =
				'./' + path.join(dirname, node.source.value) + '.js';
			deps[node.source.value] = abspath;
		},
	});

	// console.log(deps);
	// transform code
	const { code } = babel.transformFromAst(ast, null, {
		presets: ['@babel/preset-env'],
	});

	// console.log(code);

	return (moduleInfo = { file, deps, code });
};

const parseModules = (file) => {
	const entry = getModuleInfo(file);
	const temp = [entry];
	const depsGraph = {};

	for (let i = 0; i < temp.length; i++) {
		const deps = temp[i].deps;
		if (deps) {
			for (const key in deps) {
				if (deps.hasOwnProperty(key)) {
					temp.push(getModuleInfo(deps[key]));
				}
			}
		}
	}

	// console.log(temp);
	temp.forEach((moduleInfo) => {
		depsGraph[moduleInfo.file] = {
			deps: moduleInfo.deps,
			code: moduleInfo.code,
		};
	});

	// console.log(depsGraph);
	// console.log(JSON.stringify(depsGraph));
	return depsGraph;
};

// entry
parseModules('./src/index.js');

const bundle = (file) => {
	const depsGraph = JSON.stringify(parseModules(file));
	return `(function(graph){
        function require(file) {
            function absRequire(relPath) {
                return require(graph[file].deps[relPath]);
            }
            var exports = {}
            (function(require, exports, code){
                eval(code);
            })(absRequire, exports, graph[file].code);
            return exports;
        }
        require('${file}');
    })(${depsGraph})`;
};

// const content = bundle('./src/index.js');
// console.log(content);
// fs.rmdir('./dist', (err) => {
// fs.mkdirSync('./dist');
// fs.writeFile('./dist/bundle.js', content, null, (error) => {});
// });

deleteFolderRecursive = function (url) {
	var files = [];
	if (fs.existsSync(url)) {
		files = fs.readdirSync(url);
		files.forEach(function (file, index) {
			var curPath = path.join(url, file);
			if (fs.statSync(curPath).isDirectory()) {
				deleteFolderRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(url);
	} else {
		console.log('file or directory not exists.');
	}
};

const content = bundle('./src/index.js');
deleteFolderRecursive('./dist');
fs.mkdirSync('./dist');
fs.writeFile('./dist/bundle.js', content, null, (error) => {});
