(function() {
    const vscode = acquireVsCodeApi();
    document.getElementById('header').remove();
    document.getElementById('sidebar-shortcuts').remove();
    document.querySelectorAll('a').forEach((element) => {
        element.addEventListener('click', (e) => {
            const targetLink = e.currentTarget;
            const targetUrl = targetLink.href;

            if (targetUrl.substring(0, 3) === 'ide') {
                vscode.postMessage({
                    command: 'open-native-link',
                    url: targetUrl
                });
            } else if (!targetLink.classList.contains('sf-dump-ref') && !targetLink.classList.contains('toggle-button')) {
                vscode.postMessage({
                    command: 'open-link',
                    url: targetUrl
                });
            }
        });
    });
}());
