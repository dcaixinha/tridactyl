import * as Completions from "@src/completions"
import { browserBg } from "@src/lib/webext"

class TabHistoryCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, tab) {
        super()
        this.fuseKeys.push(this.value, tab.title)

        const index = tab.id ? tab.id : ""

        this.fuseKeys.push(String(index))

        this.html = html`<tr class="TabHistoryCompletionOption option">
            <td class="prefix">${index}</td>
            <td class="container"></td>
            <td class="title">${tab.title}</td>
            <td class="content">
                <a class="url" href="${tab.href}">${tab.href}</a>
            </td>
        </tr>`
    }
}

export class TabHistoryCompletionSource extends Completions.CompletionSourceFuse {
    public options: TabHistoryCompletionOption[]

    constructor(private _parent) {
        super(["back", "forward"], "TabHistoryCompletionSource", "Tab history")

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr

        const tab = await browserBg.tabs.query({
            active: true,
            currentWindow: true,
        })
        let history = await browserBg.sessions.getTabValue(tab[0].id, "history")
        if (!history) history = { list: [] }

        let jump = history["list"][history["current"]]
        let counter = 0
        if (jump) history["list"][history["current"]]["index"] = "%"
        while (jump && history["list"][jump["prev"]]) {
            counter -= 1
            history["list"][jump["prev"]]["index"] = counter
            jump = history["list"][jump["prev"]]
        }
        jump = history["list"][history["current"]]
        counter = 0
        while (jump && history["list"][jump["next"]]) {
            counter += 1
            history["list"][jump["next"]]["index"] = counter
            jump = history["list"][jump["next"]]
        }
        history["list"] = history["list"].filter(el =>
            Object.prototype.hasOwnProperty.call(el, "index"),
        )

        this.options = this.scoreOptions(
            history["list"].map(
                item =>
                    new TabHistoryCompletionOption(item.href, {
                        href: item.href,
                        id: item.index,
                        title: item.title,
                    }),
            ),
        )
        this.updateChain()
    }

    private scoreOptions(options: TabHistoryCompletionOption[]) {
        return options
    }
}
