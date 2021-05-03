import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { get, IncomingMessage } from 'http'

import { TreeViewDataProvider } from './tokens/TreeViewDataProvider'
import { Token } from './tokens/Token'

export function activate(context: vscode.ExtensionContext) {
    let profilerWebViewInstance: vscode.WebviewPanel | undefined
    let wsRoot = '.'

    if (vscode.workspace.workspaceFolders !== undefined) {
        wsRoot = vscode.workspace.workspaceFolders[0].uri.path
    }

    const devCachePath = path.join(
        wsRoot,
        vscode.workspace
            .getConfiguration('papsou-symfony-profiler')
            .get('symfonyCacheDir', 'var/cache/dev')
    )

    const tokenListProvider = new TreeViewDataProvider(wsRoot, devCachePath)

    vscode.window.createTreeView('papsou-symfony-profiler-view', {
        treeDataProvider: tokenListProvider,
        showCollapseAll: true,
        canSelectMany: true
    })

    const commands = [

        // REFRESH

        vscode.commands.registerCommand('papsou-symfony-profiler.refresh', () => {
            tokenListProvider.updateCachePath(
                path.join(
                    wsRoot,
                    vscode.workspace
                        .getConfiguration('papsou-symfony-profiler')
                        .get('symfonyCacheDir', 'var/cache/dev')
                )
            )
            tokenListProvider.refresh()
        }),

        // OPEN TOKEN

        vscode.commands.registerCommand('papsou-symfony-profiler.open-token', (token: Token) => {
            const baseUrl = token.token.url.split('/app_dev.php')[0]
            const profilerUrl = baseUrl
                .concat('/app_dev.php/_profiler/')
                .concat(token.tokenUrl !== undefined ? token.tokenUrl : token.token.token)

            if (profilerWebViewInstance !== undefined) {
                profilerWebViewInstance.dispose()
            }

            profilerWebViewInstance = vscode.window.createWebviewPanel(
                'papsou-symfony-profiler.profiler-web-view',
                token.token.token,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    enableCommandUris: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: []
                }
            )

            get(profilerUrl, (res: IncomingMessage) => {
                let pageContent = ''
                res
                    .on('data', (chunk) => {
                        pageContent += chunk
                    })
                    .on('end', () => {
                        fs.readFile(path.join(__filename, '..', '..', 'profilerWebView', 'styles.css'), 'utf8', (error, style) => {

                            fs.readFile(path.join(__filename, '..', '..', 'profilerWebView', 'script.js'), 'utf8', (error, script) => {

                                pageContent = pageContent.replace(
                                    '</body>',
                                    `<style>${style}</style><script type="text/javascript">${script}</script></body>`
                                )

                                if (profilerWebViewInstance !== undefined) {
                                    profilerWebViewInstance.webview.html = pageContent

                                    profilerWebViewInstance.webview.onDidReceiveMessage(
                                        message => {

                                            if (message.command == 'open-link') {

                                                // open standard links

                                                if (message.url.includes('?')) {
                                                    token.tokenUrl = token.token.token.concat('?').concat(message.url.split('?')[1])
                                                    vscode.commands.executeCommand('papsou-symfony-profiler.open-token', token)
                                                }
                                            } else if (message.command == 'open-native-link') {

                                                // open ide:// links
                                                exec('xdg-open "'.concat(message.url).concat('"'))
                                            }
                                        },
                                        undefined,
                                        context.subscriptions
                                    )
                                }
                            })
                        })
                    })
            })
            .end()
        })
    ]

    context.subscriptions.push(...commands)
}

export function deactivate() { }
