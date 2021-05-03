import * as vscode from 'vscode'
import * as path from 'path'

import { Token } from "./Token"
import { TokenIndexItem } from "./TokenIndexItem"

export class TokenExpandedInfo extends Token {
    constructor(
        public readonly token: TokenIndexItem,
        public readonly property: string,
    ) {
        super(token)

        this.contextValue = 'profiler-entry-detail'
        this.collapsibleState = vscode.TreeItemCollapsibleState.None

        this.label = token[property as keyof typeof token] as string

        if (property === 'time') {
            const tokenDate = new Date()
            tokenDate.setTime(this.token.time * 1000)
            this.label = tokenDate.toLocaleString()
        }

        this.iconPath = path.join(__filename, '..', '..', 'img', property.concat('.svg'))
    }
}