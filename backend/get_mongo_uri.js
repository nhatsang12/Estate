const fs = require('fs');
const dns = require('dns');
dns.setServers(['8.8.8.8']);
dns.resolveSrv('_mongodb._tcp.test.cslurct.mongodb.net', (e1, srvRecords) => {
    if (e1) return console.error(e1);
    dns.resolveTxt('test.cslurct.mongodb.net', (e2, txtRecords) => {
        if (e2) return console.error(e2);
        const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(',');
        const options = txtRecords[0][0];
        fs.writeFileSync('uri_utf8.txt', `mongodb://${hosts}/?${options}`, 'utf8');
    });
});
