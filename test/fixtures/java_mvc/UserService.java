import javax.persistence.EntityManager;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import java.io.IOException;
import java.io.File;
import java.io.FileInputStream;
import java.io.ObjectInputStream;
import java.net.URL;
import java.util.Random;
import java.security.MessageDigest;
import javax.xml.parsers.DocumentBuilderFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.web.multipart.MultipartFile;
import javax.servlet.http.HttpServletResponse;
import com.mongodb.client.MongoCollection;
import org.bson.Document;

public class UserService {
    private EntityManager entityManager;
    private ScriptEngine engine;
    private MongoCollection<Document> mongoCollection;
    private Object repository;

    public String unsafeSql(String id) {
        String query = "DELETE FROM users WHERE id = " + id;
        this.entityManager.createNativeQuery(query).executeUpdate();
        return "Deleted";
    }

    public String unsafeCmd(String cmd) {
        try {
            Runtime.getRuntime().exec(cmd);
            return "Executed";
        } catch (IOException e) { return "Error"; }
    }

    public String unsafeCode(String code) {
        try {
            this.engine.eval(code);
            return "Executed";
        } catch (Exception e) { return "Error"; }
    }

    public String unsafeSsrf(String url) {
        try {
            new URL(url).openConnection();
            return "Connected";
        } catch (Exception e) { return "Error"; }
    }

    public String unsafePath(String file) {
        try {
            new FileInputStream(file);
            return "Opened";
        } catch (Exception e) { return "Error"; }
    }

    public String unsafeNoSql(String filter) {
        this.mongoCollection.find(new Document("$where", filter));
        return "Found";
    }

    public String unsafeDeserial(String payload) {
        try {
            new ObjectInputStream(new FileInputStream(payload));
            return "Deserialized";
        } catch (Exception e) { return "Error"; }
    }

    public String unsafeProto(Object json) {
        Object target = new Object();
        BeanUtils.copyProperties(json, target);
        return "Copied";
    }

    public String unsafeSsti(String template) {
        // Mock template engine
        // this.templateEngine.process(template, ...);
        return "Processed";
    }

    public String unsafeXxe(String xml) {
        try {
            DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(xml);
            return "Parsed";
        } catch (Exception e) { return "Error"; }
    }

    public String unsafeMass(Object data) {
        // Mock repository save
        // this.repository.save(data);
        return "Saved";
    }

    public String unsafeBola(String id) {
        // Mock repository findById
        // this.repository.findById(id);
        return "Found";
    }

    public String unsafeCsrf(Object data) {
        // Mock CSRF disable
        // http.csrf().disable();
        return "Disabled";
    }

    public String unsafeUpload(MultipartFile file) {
        try {
            file.transferTo(new File("/tmp/upload"));
            return "Uploaded";
        } catch (Exception e) { return "Error"; }
    }

    public String unsafeCrypto(String pass) {
        try {
            MessageDigest.getInstance("MD5").digest(pass.getBytes());
            return "Hashed";
        } catch (Exception e) { return "Error"; }
    }

    public void unsafeXss(String input, HttpServletResponse response) {
        try {
            response.getWriter().write(input);
        } catch (IOException e) { }
    }

    public String unsafeLog(String msg) {
        System.out.println(msg);
        return "Logged";
    }

    public void unsafeRedirect(String url, HttpServletResponse response) {
        try {
            response.sendRedirect(url);
        } catch (IOException e) { }
    }
}
