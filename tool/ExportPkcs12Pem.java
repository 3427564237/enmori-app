import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.util.Base64;
import java.util.Enumeration;

public final class ExportPkcs12Pem {
  public static void main(String[] args) throws Exception {
    char[] password = args[1].toCharArray();
    KeyStore store = KeyStore.getInstance("PKCS12");
    try (InputStream input = Files.newInputStream(Path.of(args[0]))) {
      store.load(input, password);
    }
    Enumeration<String> aliases = store.aliases();
    if (!aliases.hasMoreElements()) throw new IllegalStateException("No test certificate");
    String alias = aliases.nextElement();
    PrivateKey key = (PrivateKey) store.getKey(alias, password);
    String privatePem = pem("PRIVATE KEY", key.getEncoded());
    String certificatePem = pem("CERTIFICATE", store.getCertificate(alias).getEncoded());
    Files.writeString(Path.of(args[2]), privatePem);
    Files.writeString(Path.of(args[3]), certificatePem);
  }

  private static String pem(String label, byte[] bytes) {
    return "-----BEGIN " + label + "-----\n"
        + Base64.getMimeEncoder(64, new byte[] {'\n'}).encodeToString(bytes)
        + "\n-----END " + label + "-----\n";
  }
}
