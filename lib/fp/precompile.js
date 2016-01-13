var path = require('path');
var Module = require('module');
var _ = require('lodash/fp');
var fs = require('fs');

var collectionModules = [
  'array.js',
  'collection.js',
  'date.js',
  'function.js',
  'lang.js',
  'math.js',
  'number.js',
  'object.js',
  'string.js',
  'util.js'
];

var utilityModules = [
  'util.js', // XXX: Remove! Not actually an utility but a collection module but it interferes testing with the current releases...
  'lodash.js',
  'fp.js',
  'chain.js'
];

var lodashPath = path.dirname(Module._resolveFilename('lodash', Object.assign(new Module, {
  'paths': Module._nodeModulePaths(process.cwd())
})));

var mapping = require(lodashPath + '/fp/mapping');
var singleArgFns = mapping.aryMethodMap[1];

var extPattern = /\.js$/;
var isJSfile = f => extPattern.test(f);
var removeJSExt = f => f.replace(extPattern, '');

var isCollectionModule = _.includes(_, collectionModules);
var isNotUtilityModule = _.negate(_.includes(_, utilityModules));
var isSingleArgFn = _.includes(_, singleArgFns);

var lodashModules = fs.readdirSync(lodashPath)
  .filter(isJSfile)
  .filter(isNotUtilityModule)
  .map(removeJSExt);

var convertTemplate = name => `
var convert = require("./convert");
module.exports = convert("${name}", require("../${name}"));
`.trim();

var collectionTemplate = name => `
var convert = require("./convert");
module.exports = convert(require("../${name}"));
`.trim();

var passThroughTemplate = name => `module.exports = require("../${name}");`;

var moduleTemplate = name => {
  if (isCollectionModule(name + '.js')) {
    return collectionTemplate(name);
  }
  if (isSingleArgFn(name)) {
    return passThroughTemplate(name);
  }

  return convertTemplate(name);
};

function precompileFpWrappers(target) {
  _.forEach(moduleName => {
    fs.writeFileSync(
      path.join(target, moduleName + '.js'),
      moduleTemplate(moduleName)
    );
  }, lodashModules);

  _.forEach((aliases, origName) => {

    _.forEach(aliasName => {
      fs.writeFileSync(
        path.join(target, aliasName + '.js'),
        moduleTemplate(origName)
      );
    }, aliases);
  }, mapping.aliasMap);
}

module.exports = precompileFpWrappers;

if (require.main === module) {
  var target = process.argv[2];
  var scriptName = path.basename(process.argv[1]);

  if (!target) {
    console.error('Usage: ' + scriptName + ' <target path>');
    process.exit(1);
  }

  precompileFpWrappers(target);
}
