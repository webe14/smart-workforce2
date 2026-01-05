module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            webpackConfig.module.rules.push({
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
                exclude: /node_modules\/face-api.js/,
            });

            // Also ignore source map warnings specifically
            webpackConfig.ignoreWarnings = [
                function ignoreSourcemapsloaderWarnings(warning) {
                    return (
                        warning.module &&
                        warning.module.resource.includes("node_modules") &&
                        warning.details &&
                        warning.details.includes("source-map-loader")
                    );
                },
            ];

            // Polyfill fs for face-api.js
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
            };

            return webpackConfig;
        },
    },
};
