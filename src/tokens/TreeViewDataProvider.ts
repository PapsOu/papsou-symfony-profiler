import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as csv from 'csv-parse'
import { PathLike } from 'node:fs'

import { Token } from './Token'
import { TokenExpandedInfo } from './TokenExpandedInfo'
import { TokenIndexItem } from './TokenIndexItem'

export class TreeViewDataProvider implements vscode.TreeDataProvider<Token> {
    private watcher: vscode.FileSystemWatcher | undefined
    private profilerIndexFilePath: PathLike
    constructor(
        private workspaceRoot: string,
        private devCachePath: string,
    ) {
        this.profilerIndexFilePath = path.join(this.devCachePath, 'profiler', 'index.csv')
        this.initFileWatcher()
    }

    getTreeItem(element: Token): vscode.TreeItem {
        return element
    }

    getChildren(element?: Token): Thenable<Token[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No token')
            return Promise.resolve([])
        }

        if (!element) {
            const profilerPath = path.join(this.devCachePath, 'profiler')
            if (!this.pathExists(profilerPath)) {
                return Promise.resolve([])
            }

            const results: any[] = []
            const ignoreRegexp :string[] = vscode.workspace
                .getConfiguration('papsou-symfony-profiler')
                .get('ignoreUrlRegex', [])

            return new Promise((resolve, reject) => {
                return fs
                    .createReadStream(this.profilerIndexFilePath)
                    .pipe(csv({
                        from_line: 1
                    }))
                    .on('data', (data) => {
                        if (ignoreRegexp.length > 0) {
                            for (let regexp of ignoreRegexp) {
                                const match = data['3'].match(new RegExp(regexp))
                                if(match !== null && match.length > 0) {
                                    return
                                }
                            }
                        }

                        results.push(
                            new Token(
                                new TokenIndexItem(data)
                            )
                        )
                    })
                    .on('end', () => {
                        results.reverse()
                        resolve(results)
                    })
            })
        } else {
            if (element.token.detailDisplayed === false) {
                element.token.detailDisplayed = true
                return Promise.resolve([
                    new TokenExpandedInfo(element.token, 'token'),
                    new TokenExpandedInfo(element.token, 'clientIp'),
                    new TokenExpandedInfo(element.token, 'method'),
                    new TokenExpandedInfo(element.token, 'url'),
                    new TokenExpandedInfo(element.token, 'time'),
                    new TokenExpandedInfo(element.token, 'status')
                ])
            } else {
                return Promise.resolve([])
            }
        }
    }

    private pathExists(p: string): boolean {
        try {
            fs.accessSync(p)
        } catch (err) {
            return false
        }
        return true
    }

    private _onDidChangeTreeData: vscode.EventEmitter<Token | undefined | null | void> = new vscode.EventEmitter<Token | undefined | null | void>()
    readonly onDidChangeTreeData: vscode.Event<Token | undefined | null | void> = this._onDidChangeTreeData.event

    refresh(): void {
        this._onDidChangeTreeData.fire()
    }

    updateCachePath(cachePath: string): void {
        this.devCachePath = cachePath
        this.initFileWatcher()
    }

    private initFileWatcher(): void {
        if (this.watcher !== undefined) {
            this.watcher.dispose()
        }
        this.profilerIndexFilePath = path.join(this.devCachePath, 'profiler', 'index.csv')
        console.log('Watching ' + this.profilerIndexFilePath)
        this.watcher = vscode.workspace.createFileSystemWatcher(this.profilerIndexFilePath)

        this.watcher.onDidChange(() => {
            vscode.commands.executeCommand('papsou-symfony-profiler.refresh')
        })
    }
}
