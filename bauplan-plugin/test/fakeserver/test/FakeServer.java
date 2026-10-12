package test;
import org.bukkit.*;
import org.bukkit.entity.Player;
public class FakeServer {
    static class FP implements Player {
        final String name; Location loc; FP(String n, Location l) { name = n; loc = l; }
        public Location getLocation() { return loc; } public String getName() { return name; }
        public void sendMessage(String m) { System.out.println("[an " + name + "] " + m); }
    }
    public static void main(String[] a) throws Exception {
        World welt = () -> "world";
        FP josef = new FP("Josef", new Location(welt, 1000, 60, 2000, 0, 0));
        Bukkit.SPIELER.add(josef);
        Bukkit.SPIELER.add(new FP("Steve", new Location(welt, 1250.5, 121, 2300.5, 180, 15)));
        de.bauen.bauplanlive.BauplanLive p = new de.bauen.bauplanlive.BauplanLive();
        p.onEnable();
        // Josef steht an der Ecke und setzt den Ursprung
        p.onCommand(josef, new org.bukkit.command.Command() {}, "bauplan", new String[] { "ursprung" });
        long ende = System.currentTimeMillis() + Long.parseLong(a.length > 0 ? a[0] : "20000");
        double t = 0;
        while (System.currentTimeMillis() < ende) {
            t += 0.05;
            josef.loc = new Location(welt, 1000 + 250 + Math.cos(t) * 40, 60 + 111, 2000 + 185 + Math.sin(t) * 40, (float) Math.toDegrees(t), 10);
            if (Sched.task != null) Sched.task.run();
            Thread.sleep(200);
        }
        p.onDisable();
        System.exit(0);
    }
}
