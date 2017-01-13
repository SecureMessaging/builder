let NGit = require("nodegit");
var tmp = require('tmp');

export class Git {
    public build_path: string;
    public repo_url: string;

    private repo: any;

    async clone(repo_url: string): Promise<any> {
        this.repo_url = repo_url;
        this.build_path = tmp.dirSync().name;
        console.log(this.build_path);
        this.repo = await NGit.Clone(this.repo_url, this.build_path);
    }

    async checkoutBranch(branchName: string): Promise<any> {
        let ref = await this.repo.getBranch('refs/remotes/origin/' + branchName);
        return this.repo.checkoutRef(ref);
    }
}
