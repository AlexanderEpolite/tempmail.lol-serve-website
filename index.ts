import { readdirSync, readFileSync, statSync } from "fs";
import { createServer } from "http";
import { join, extname, relative } from "path";
import mime from "mime-types";

console.log("Serving from /var/www/html/");

const file_cache: { [key: string]: Buffer } = {};

function cacheAllFiles(directory: string) {
    readdirSync(directory).forEach((file) => {
        const filePath = join(directory, file);
        const fileStat = statSync(filePath);

        if (fileStat.isDirectory()) {
            cacheAllFiles(filePath);
        } else {
            const fileContent = readFileSync(filePath);
            const relativePath = relative("/var/www/html", filePath);
            file_cache[relativePath] = fileContent;
            console.log(`Cached ${relativePath}`);
        }
    });
}

cacheAllFiles("/var/www/html/");

createServer((req, res) => {
    const filePath = req.url?.substring(1);
    
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.setHeader('X-XSS-Protection',  '1; mode=block');
    res.setHeader("X-Your-Thing-Origin", filePath || "/")
    
    if(filePath === "") {
        res.setHeader('Content-Type', 'text/html');
        
        res.writeHead(200);
        
        res.end(file_cache['index.html']);
        return;
    }
    
    if (filePath && file_cache[filePath]) {
        const mimeType = mime.lookup(extname(filePath)) || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': mimeType });
        
        res.end(file_cache[filePath]);
    } else {
        let vue_route = filePath?.match(/(\/[a-z]{2})?\/(contact|api|docs|pricing|free-encrypted-chat|privacy|privacy-policy|terms|terms-of-service|index|terms-of-use|faq)?(.html)?(\/)?$/)
        
        let sc = (vue_route || filePath === "/") ? 200 : 404;
        res.setHeader('Content-Type', 'text/html');
        
        res.writeHead(sc);
        
        res.end(file_cache['index.html']);
    }
}).listen(3000, () => {
    console.log("Server is listening on port 3000");
});
