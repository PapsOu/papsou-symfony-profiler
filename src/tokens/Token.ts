import * as vscode from 'vscode'
import * as path from 'path'

import { TokenIndexItem } from './TokenIndexItem'

export class Token extends vscode.TreeItem {
    public tokenUrl: string | undefined = undefined

    constructor(
        public readonly token: TokenIndexItem
    ) {
        super('', vscode.TreeItemCollapsibleState.Collapsed)

        let status = 'unknown'

        if (token.status >= 200 && token.status < 300) {
            status = 'success'
        } else if (token.status >= 300 && token.status < 400) {
            status = 'warning'
        } else if (token.status >= 400) {
            status = 'error'
        }

        let icon = path.join(__filename, '..', '..', 'img', 'http_state', status.concat('.svg'))

        this.iconPath = {
            light: icon,
            dark: icon
        }

        this.label = this.generateLabel()
        this.contextValue = 'profiler-entry'
    }

    public generateLabel(): string {

        const tokenDate = new Date()
        tokenDate.setTime(this.token.time * 1000)

        return `${this.token.method} ${this.token.status.toString()} - ${this.token.url}`
    }

    public setExpanded(): void {
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded
    }

    public setCollapsed(): void {
        this.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed
    }

    private padString(str: string, length: number): string {
        return str.padEnd(length, ' ')
    }
}
