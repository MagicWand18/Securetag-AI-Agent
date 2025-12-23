import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;
import javax.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/sql")
    public String testSql(@RequestParam String id) {
        return this.userService.unsafeSql(id);
    }

    @PostMapping("/cmd")
    public String testCmd(@RequestParam String cmd) {
        return this.userService.unsafeCmd(cmd);
    }

    @PostMapping("/code")
    public String testCode(@RequestParam String code) {
        return this.userService.unsafeCode(code);
    }

    @GetMapping("/ssrf")
    public String testSsrf(@RequestParam String url) {
        return this.userService.unsafeSsrf(url);
    }

    @GetMapping("/path")
    public String testPath(@RequestParam String file) {
        return this.userService.unsafePath(file);
    }

    @PostMapping("/nosql")
    public String testNoSql(@RequestParam String filter) {
        return this.userService.unsafeNoSql(filter);
    }

    @PostMapping("/deserial")
    public String testDeserial(@RequestParam String payload) {
        return this.userService.unsafeDeserial(payload);
    }

    @PostMapping("/proto")
    public String testProto(@RequestBody Object json) {
        return this.userService.unsafeProto(json);
    }

    @GetMapping("/ssti")
    public String testSsti(@RequestParam String template) {
        return this.userService.unsafeSsti(template);
    }

    @PostMapping("/xxe")
    public String testXxe(@RequestParam String xml) {
        return this.userService.unsafeXxe(xml);
    }

    @PostMapping("/mass")
    public String testMass(@RequestBody Object data) {
        return this.userService.unsafeMass(data);
    }

    @GetMapping("/bola/{id}")
    public String testBola(@PathVariable String id) {
        return this.userService.unsafeBola(id);
    }

    @PostMapping("/csrf")
    public String testCsrf(@RequestBody Object data) {
        return this.userService.unsafeCsrf(data);
    }

    @PostMapping("/upload")
    public String testUpload(@RequestParam("file") MultipartFile file) {
        return this.userService.unsafeUpload(file);
    }

    @GetMapping("/crypto")
    public String testCrypto(@RequestParam String pass) {
        return this.userService.unsafeCrypto(pass);
    }

    @GetMapping("/xss")
    public void testXss(@RequestParam String input, HttpServletResponse response) {
        this.userService.unsafeXss(input, response);
    }

    @PostMapping("/log")
    public String testLog(@RequestBody String msg) {
        return this.userService.unsafeLog(msg);
    }

    @GetMapping("/redirect")
    public void testRedirect(@RequestParam String url, HttpServletResponse response) {
        this.userService.unsafeRedirect(url, response);
    }
}
