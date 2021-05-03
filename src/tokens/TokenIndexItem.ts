export class TokenIndexItem {
    public token: string
    public clientIp: string
    public method: string
    public url: string
    public time: number
    public parent: string | null
    public status: number
    public detailDisplayed: boolean

    constructor(
        data: any
    ) {
        // 01b5bd,172.19.0.1,GET,http://shop.papsou/app_dev.php/cart,1619687076,,200

        this.token = data['0']
        this.clientIp = data['1']
        this.method = data['2']
        this.url = data['3']
        this.time = data['4']
        this.parent = data['5']
        this.status = data['6']
        this.detailDisplayed = false
    }
}