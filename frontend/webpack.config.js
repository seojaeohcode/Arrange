const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        main: './src/index.tsx',
        contentScript: './src/contentScript.ts',
        background: './src/background.ts',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'build'),
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/Readability.js', to: '.' },
                { from: 'public/manifest.json', to: '.' }
            ],
        }),
    ],
}; 