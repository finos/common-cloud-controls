import { RouteConfig } from "@docusaurus/types";
import {v4 as uuidv4} from 'uuid';

export class PageCreator {
    private readonly createData: (name: string, data: string | object) => Promise<string>;
    private readonly addRoute: (config: RouteConfig) => void;

    constructor(createData, addRoute) {
        this.createData = createData;
        this.addRoute = addRoute;
    }

    async createPage(pageData: any, path: string, component: string) {
        const jsonPath = await this.createData(uuidv4() + '.json', JSON.stringify(pageData));
        this.addRoute({path, component, modules: { pageData: jsonPath }, exact: true});
    }
}
