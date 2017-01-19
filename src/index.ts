import { Builder } from './builder';
import * as express from 'express';


let app = express();

app.get('/build', (req, res) => {
    let project = req.query['project'];
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-control": "no-cache" });

    if(!project) {
        project = 'apps-ssms';
    }
    if(!project) {
        res.write('Invalid Project!');
        return res.end();
    }

    let repo = `https://github.com/SecureMessaging/${project}.git`;
    let branch = 'master';
    let target = 'test';

    let builder = Builder.RunBuild(repo, branch, target);
    builder.log.subscribe(x => res.write(x));

    builder.log.filter(x => x == 'END').subscribe(x => res.end());
});

app.post('/web-hook', (req, res) => {
    let body = '';
    req.on('data', x=> body += x.toString());
    req.on('end', () => {
        let event: GitHubPushEvent = JSON.parse(body);
        let repo = `https://github.com/SecureMessaging/${event.repository.name}.git`;
        let branch = event.ref.split('/').pop();
        let target = req.params['target'] || 'test';
        res.writeHead(200);
        Builder.RunBuild(repo, branch, target);
        res.end();
    });
});


app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})



interface GitHubPushEvent {
    ref: string;
    repository: GitHubRepository;
}

interface GitHubRepository {
    name: string
}