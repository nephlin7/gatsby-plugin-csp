const React = require("react");
const flatten = require("lodash.flatten");
var fs = require("fs");

const {
  computeHash,
  cspString,
  getHashes,
  defaultDirectives,
} = require("./utils");

exports.onPreRenderHTML = (
  {
    getHeadComponents,
    replaceHeadComponents,
    getPreBodyComponents,
    getPostBodyComponents,
  },
  userPluginOptions,
) => {
  const {
    disableOnDev = true,
    reportOnly = false,
    mergeScriptHashes = true,
    mergeStyleHashes = true,
    mergeDefaultDirectives = true,
    useHttpHeader = false,
    directives: userDirectives,
  } = userPluginOptions;

  // early return if plugin is disabled on dev env
  if (process.env.NODE_ENV === "development" && disableOnDev) {
    return;
  }

  let components = [
    ...flatten(getHeadComponents()),
    ...flatten(getPostBodyComponents()),
    ...flatten(getPreBodyComponents()),
  ];

  let directives = {
    ...(mergeDefaultDirectives && defaultDirectives),
    ...userDirectives,
  };

  let csp = {
    ...directives,
    ...(mergeScriptHashes && {
      "script-src": `${directives["script-src"] || ""} ${getHashes(
        components,
        "script",
      )}`,
    }),
    ...(mergeStyleHashes && {
      "style-src": `${directives["style-src"] || ""} ${getHashes(
        components,
        "style",
      )}`,
    }),
  };

  if (useHttpHeader) {
    //Add http header
    const path = "_headers";
    const httpEquiv = reportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";
    const rules = cspString(csp);
    const finalText = `# csp rules\n/*\n ${httpEquiv}: ${rules}\n# csp rules`;

    try {
      if (fs.existsSync(path)) {
        //file exists
        console.log("Already exist _headers file, will be replace config");
        fs.writeFile(path, finalText, function(err) {
          if (err) {
            return console.log(err);
          }
        });
      } else {
        const writeStream = fs.createWriteStream("_headers");

        writeStream.write(finalText);

        writeStream.on("finish", () => {
          console.log("Rules writen successfull");
        });

        // close the stream
        writeStream.end();
      }
    } catch (err) {
      console.error(err);
    }
  } else {
    //Add Meta
    const cspComponent = React.createElement("meta", {
      httpEquiv: `${
        reportOnly
          ? "Content-Security-Policy-Report-Only"
          : "Content-Security-Policy"
      }`,
      content: cspString(csp),
    });

    let headComponentsWithCsp = [cspComponent, ...getHeadComponents()];

    replaceHeadComponents(headComponentsWithCsp);
  }
};
