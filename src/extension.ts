import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as rimraf from 'rimraf'
import { exec } from 'child_process'
import { get, IncomingMessage } from 'http'

import { TreeViewDataProvider } from './tokens/TreeViewDataProvider'
import { Token } from './tokens/Token'
import { TokenIndexItem } from './tokens/TokenIndexItem'

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
        showCollapseAll: false,
        canSelectMany: false
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

        // PURGE

        vscode.commands.registerCommand('papsou-symfony-profiler.purge', (token?: Token) => {
            let profilerPath = path.join(
                wsRoot,
                vscode.workspace
                    .getConfiguration('papsou-symfony-profiler')
                    .get('symfonyCacheDir', 'var/cache/dev'),
                'profiler'
            )

            if (token !== undefined) {
                const profilerIndex = path.join(profilerPath, 'index.csv')
                const filterToken = (data: string) => {
                    return data
                        .split('\n')
                        .filter((val, i) => val.substr(0, 6) !== token.token.token)
                        .join('\n')
                }

                fs.readFile(profilerIndex, 'utf8', (err, data) => {
                    const filteredData = filterToken(data)
                    console.log(filteredData)
                    fs.writeFile(profilerIndex, filteredData, 'utf8', err2 => {
                    })
                })

                profilerPath = path.join(
                    profilerPath,
                    token.token.token.substr(4,2),
                    token.token.token.substr(2,2),
                    token.token.token
                )

                fs.unlink(profilerPath, (err) => {
                    if (err !== null) {
                        console.error(err)
                        vscode.window.showErrorMessage(
                            `Cannot remove token ${token.token.token} at path ${profilerPath}`
                        )
                    }
                })
            }
        }),

        // PURGE ALL

        vscode.commands.registerCommand('papsou-symfony-profiler.purge-all', (token?: Token) => {
            let profilerPath = path.join(
                wsRoot,
                vscode.workspace
                    .getConfiguration('papsou-symfony-profiler')
                    .get('symfonyCacheDir', 'var/cache/dev'),
                'profiler'
            )

            rimraf(profilerPath, (err) => {
                if (err !== null) {
                    console.error(err)
                    vscode.window.showErrorMessage(`Cannot remove profiler dir ${profilerPath}`)
                }

                tokenListProvider.refresh()
            })
        }),

        // OPEN TOKEN

        vscode.commands.registerCommand('papsou-symfony-profiler.open-token', (token: Token) => {
            let profilerBaseUrl: string = vscode.workspace
                .getConfiguration('papsou-symfony-profiler')
                .get('profilerBaseUrl', '')

            if (profilerBaseUrl === '') {
                vscode.window.showErrorMessage('Please define configuration key `papsou-symfony-profiler.profilerBaseUrl` in order to show profiler pages.')
                vscode.commands.executeCommand('workbench.action.openWorkspaceSettingsFile')
            } else {
                console.log(profilerBaseUrl)
                console.log(profilerBaseUrl.substr(-1, 1))
                if (profilerBaseUrl.substr(-1, 1) !== '/') {
                    profilerBaseUrl = profilerBaseUrl.concat('/')
                }
                const profilerUrl = profilerBaseUrl
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
                                                        token.tokenUrl = `${token.token.token}?${message.url.split('?')[1]}`
                                                        vscode.commands.executeCommand('papsou-symfony-profiler.open-token', token)
                                                    } else if (message.url.endsWith('_profiler/phpinfo')) {
                                                        let tempToken = new Token(new TokenIndexItem(['phpinfo','','','',0,null,200]))
                                                        vscode.commands.executeCommand('papsou-symfony-profiler.open-token', tempToken)
                                                    }
                                                } else if (message.command == 'open-native-link') {

                                                    // open ide:// links
                                                    exec(`xdg-open "${message.url}"`)
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
            }
        })
    ]

    context.subscriptions.push(...commands)
}

export function deactivate() { }
