(function() {
    const vscode = acquireVsCodeApi();
    document.getElementById('header').remove();
    document.getElementById('sidebar-shortcuts').remove();
    document.querySelectorAll('a').forEach((element) => {
        element.addEventListener('click', (e) => {
            const targetUrl = e.currentTarget.href;
            if (targetUrl.substring(0, 3) === 'ide') {
                vscode.postMessage({
                    command: 'open-native-link',
                    url: targetUrl
                });
            } else {
                vscode.postMessage({
                    command: 'open-link',
                    url: targetUrl
                });
            }
        });
    });
}());
