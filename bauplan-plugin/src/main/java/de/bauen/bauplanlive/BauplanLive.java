package de.bauen.bauplanlive;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * BauplanLive – zeigt die Bauplan-Website direkt vom Minecraft-Server aus an
 * und schickt die Positionen aller Spieler live an alle offenen Browser.
 *
 *   http://SERVER-IP:8100/            die Website (3D-Ansicht, 2D-Plan, Etappen …)
 *   http://SERVER-IP:8100/api/players aktuelle Spielerpositionen als JSON
 *   http://SERVER-IP:8100/api/stream  Live-Strom (Server-Sent Events)
 *   http://SERVER-IP:8100/api/state   gemeinsamer Zustand: Ursprung, Welt, „Position gesperrt“
 *
 * Befehle: /bauplan ursprung · /bauplan link · /bauplan folgen <Spieler> · /bauplan entsperren
 */
public final class BauplanLive extends JavaPlugin {

    private HttpServer server;
    private ExecutorService threads;
    private BukkitTask task;
    private volatile String playersJson = "[]";
    private final Properties settings = new Properties();
    private final Properties state = new Properties();
    private File stateFile;
    private Path webRoot;
    private int port;

    @Override
    public void onEnable() {
        try {
            getDataFolder().mkdirs();
            loadSettings();
            stateFile = new File(getDataFolder(), "zustand.properties");
            if (stateFile.exists()) try (Reader r = new InputStreamReader(new FileInputStream(stateFile), StandardCharsets.UTF_8)) { state.load(r); }
            webRoot = new File(getDataFolder(), "web").toPath();
            unpackWeb();
            startServer();
            long ticks = Long.parseLong(settings.getProperty("intervall-ticks", "4"));
            task = Bukkit.getScheduler().runTaskTimer(this, this::snapshot, 20L, Math.max(1L, ticks));
            getLogger().info("Bauplan-Website läuft auf Port " + port + " – im Browser http://<server-ip>:" + port + " öffnen");
        } catch (Exception e) {
            getLogger().severe("BauplanLive konnte nicht starten: " + e.getMessage());
        }
    }

    @Override
    public void onDisable() {
        if (task != null) task.cancel();
        if (server != null) server.stop(0);
        if (threads != null) threads.shutdownNow();
    }

    // ------------------------------------------------------------------ Einstellungen

    private void loadSettings() throws IOException {
        File f = new File(getDataFolder(), "einstellungen.properties");
        if (!f.exists()) {
            try (Writer w = new OutputStreamWriter(new FileOutputStream(f), StandardCharsets.UTF_8)) {
                w.write("# BauplanLive – Einstellungen\n");
                w.write("# Port der Website (im Browser: http://SERVER-IP:PORT). Muss in der Firewall freigegeben sein.\n");
                w.write("port=8100\n");
                w.write("# Wie oft Positionen aktualisiert werden (20 Ticks = 1 Sekunde)\n");
                w.write("intervall-ticks=4\n");
                w.write("# Website bei jedem Start neu aus dem Plugin entpacken (false = eigene Änderungen in web/ behalten)\n");
                w.write("web-aktualisieren=true\n");
            }
        }
        try (Reader r = new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8)) { settings.load(r); }
        port = Integer.parseInt(settings.getProperty("port", "8100").trim());
    }

    private synchronized void saveState() {
        try (Writer w = new OutputStreamWriter(new FileOutputStream(stateFile), StandardCharsets.UTF_8)) {
            state.store(w, "BauplanLive – gemeinsamer Zustand");
        } catch (IOException e) {
            getLogger().warning("Zustand nicht gespeichert: " + e.getMessage());
        }
    }

    /** Entpackt die mitgelieferte Website aus der Plugin-Datei nach plugins/BauplanLive/web/ */
    private void unpackWeb() throws IOException {
        boolean neu = Boolean.parseBoolean(settings.getProperty("web-aktualisieren", "true"));
        try (InputStream liste = getResource("web/dateien.txt")) {
            if (liste == null) return;
            for (String name : new String(liste.readAllBytes(), StandardCharsets.UTF_8).split("\n")) {
                name = name.trim();
                if (name.isEmpty()) continue;
                Path ziel = webRoot.resolve(name).normalize();
                if (!ziel.startsWith(webRoot)) continue;
                if (Files.exists(ziel) && !neu) continue;
                Files.createDirectories(ziel.getParent());
                try (InputStream in = getResource("web/" + name)) {
                    if (in != null) Files.copy(in, ziel, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }
    }

    // ------------------------------------------------------------------ Positionen (Hauptthread)

    private void snapshot() {
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (Player p : Bukkit.getOnlinePlayers()) {
            Location l = p.getLocation();
            if (!first) sb.append(',');
            first = false;
            sb.append("{\"name\":").append(quote(p.getName()))
              .append(",\"world\":").append(quote(l.getWorld() == null ? "" : l.getWorld().getName()))
              .append(",\"x\":").append(round(l.getX()))
              .append(",\"y\":").append(round(l.getY()))
              .append(",\"z\":").append(round(l.getZ()))
              .append(",\"yaw\":").append(round(l.getYaw()))
              .append(",\"pitch\":").append(round(l.getPitch()))
              .append('}');
        }
        playersJson = sb.append(']').toString();
    }

    private static String round(double v) { return String.valueOf(Math.round(v * 100.0) / 100.0); }

    private static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\') sb.append('\\').append(c);
            else if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
            else sb.append(c);
        }
        return sb.append('"').toString();
    }

    private synchronized String stateJson() {
        String follow = state.getProperty("follow", "");
        return "{\"origin\":[" + state.getProperty("x", "0") + "," + state.getProperty("y", "0") + "," + state.getProperty("z", "0") + "]"
            + ",\"world\":" + quote(state.getProperty("world", ""))
            + ",\"follow\":" + (follow.isEmpty() ? "null" : quote(follow)) + "}";
    }

    // ------------------------------------------------------------------ Befehle

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        String sub = args.length > 0 ? args[0].toLowerCase(Locale.ROOT) : "link";
        switch (sub) {
            case "ursprung" -> {
                if (!(sender instanceof Player p)) { sender.sendMessage("Nur im Spiel möglich."); return true; }
                Location l = p.getLocation();
                synchronized (this) {
                    state.setProperty("x", String.valueOf(l.getBlockX()));
                    state.setProperty("y", String.valueOf(l.getBlockY()));
                    state.setProperty("z", String.valueOf(l.getBlockZ()));
                    state.setProperty("world", l.getWorld() == null ? "" : l.getWorld().getName());
                }
                saveState();
                sender.sendMessage("§aBauplan-Ursprung gesetzt: " + l.getBlockX() + " " + l.getBlockY() + " " + l.getBlockZ()
                    + " §7(die Nordwest-Ecke unten des Bauplans, dort wo die Schematic beginnt)");
            }
            case "folgen" -> {
                if (args.length < 2) { sender.sendMessage("Benutzung: /bauplan folgen <Spieler>"); return true; }
                synchronized (this) { state.setProperty("follow", args[1]); }
                saveState();
                sender.sendMessage("§aPosition gesperrt – alle Zuschauer folgen jetzt " + args[1]);
            }
            case "entsperren" -> {
                synchronized (this) { state.setProperty("follow", ""); }
                saveState();
                sender.sendMessage("§aPosition entsperrt.");
            }
            default -> sender.sendMessage("§eBauplan-Website: §fhttp://<server-ip>:" + port
                + " §7· /bauplan ursprung · /bauplan folgen <Spieler> · /bauplan entsperren");
        }
        return true;
    }

    // ------------------------------------------------------------------ Webserver

    private void startServer() throws IOException {
        threads = Executors.newCachedThreadPool(r -> { Thread t = new Thread(r, "BauplanLive-Web"); t.setDaemon(true); return t; });
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(threads);
        server.createContext("/api/players", ex -> send(ex, 200, "application/json", playersJson.getBytes(StandardCharsets.UTF_8)));
        server.createContext("/api/state", this::handleState);
        server.createContext("/api/stream", this::handleStream);
        server.createContext("/", this::handleStatic);
        server.start();
    }

    private void cors(HttpExchange ex) {
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private void send(HttpExchange ex, int status, String type, byte[] body) throws IOException {
        cors(ex);
        ex.getResponseHeaders().set("Content-Type", type);
        ex.getResponseHeaders().set("Cache-Control", "no-cache");
        ex.sendResponseHeaders(status, body.length == 0 ? -1 : body.length);
        if (body.length > 0) try (OutputStream os = ex.getResponseBody()) { os.write(body); }
        ex.close();
    }

    private static final Pattern ZAHLEN = Pattern.compile("\"origin\"\\s*:\\s*\\[\\s*(-?\\d+)\\s*,\\s*(-?\\d+)\\s*,\\s*(-?\\d+)\\s*\\]");
    private static final Pattern FOLGEN = Pattern.compile("\"follow\"\\s*:\\s*(null|\"([^\"]{0,32})\")");

    /** GET liefert den gemeinsamen Zustand, POST ändert ihn (für alle Zuschauer) */
    private void handleState(HttpExchange ex) throws IOException {
        if ("OPTIONS".equals(ex.getRequestMethod())) { send(ex, 204, "text/plain", new byte[0]); return; }
        if ("POST".equals(ex.getRequestMethod())) {
            String body = new String(ex.getRequestBody().readNBytes(4096), StandardCharsets.UTF_8);
            Matcher o = ZAHLEN.matcher(body), f = FOLGEN.matcher(body);
            synchronized (this) {
                if (o.find()) { state.setProperty("x", o.group(1)); state.setProperty("y", o.group(2)); state.setProperty("z", o.group(3)); }
                if (f.find()) state.setProperty("follow", f.group(2) == null ? "" : f.group(2));
            }
            saveState();
        }
        send(ex, 200, "application/json", stateJson().getBytes(StandardCharsets.UTF_8));
    }

    /** Live-Strom: alle 250 ms Spieler und Zustand an den Browser schicken */
    private void handleStream(HttpExchange ex) throws IOException {
        cors(ex);
        ex.getResponseHeaders().set("Content-Type", "text/event-stream");
        ex.getResponseHeaders().set("Cache-Control", "no-cache");
        ex.sendResponseHeaders(200, 0);
        try (OutputStream os = ex.getResponseBody()) {
            while (!Thread.currentThread().isInterrupted()) {
                String msg = "data: {\"players\":" + playersJson + ",\"state\":" + stateJson() + "}\n\n";
                os.write(msg.getBytes(StandardCharsets.UTF_8));
                os.flush();
                Thread.sleep(250);
            }
        } catch (IOException | InterruptedException ignored) {
            // Browser hat die Verbindung geschlossen
        } finally {
            ex.close();
        }
    }

    private static final Map<String, String> TYPEN = Map.ofEntries(
        Map.entry("html", "text/html; charset=utf-8"), Map.entry("js", "text/javascript; charset=utf-8"),
        Map.entry("css", "text/css; charset=utf-8"), Map.entry("json", "application/json"),
        Map.entry("png", "image/png"), Map.entry("webp", "image/webp"), Map.entry("svg", "image/svg+xml"),
        Map.entry("gz", "application/gzip"), Map.entry("bin", "application/octet-stream"),
        Map.entry("litematic", "application/octet-stream"), Map.entry("ico", "image/x-icon"));

    private void handleStatic(HttpExchange ex) throws IOException {
        String pfad = ex.getRequestURI().getPath();
        if (pfad.endsWith("/")) pfad += "index.html";
        Path datei = webRoot.resolve(pfad.substring(1)).normalize();
        if (!datei.startsWith(webRoot) || !Files.isRegularFile(datei)) {
            send(ex, 404, "text/plain; charset=utf-8", "Nicht gefunden".getBytes(StandardCharsets.UTF_8));
            return;
        }
        String name = datei.getFileName().toString();
        String endung = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        send(ex, 200, TYPEN.getOrDefault(endung, "application/octet-stream"), Files.readAllBytes(datei));
    }
}
