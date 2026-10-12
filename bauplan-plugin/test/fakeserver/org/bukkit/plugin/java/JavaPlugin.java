package org.bukkit.plugin.java;
public abstract class JavaPlugin implements org.bukkit.plugin.Plugin {
    public void onEnable() {} public void onDisable() {}
    public final java.io.File getDataFolder() { return new java.io.File("plugins/BauplanLive"); }
    public java.util.logging.Logger getLogger() { return java.util.logging.Logger.getLogger("BauplanLive"); }
    public java.io.InputStream getResource(String f) { return getClass().getClassLoader().getResourceAsStream(f); }
    public boolean onCommand(org.bukkit.command.CommandSender s, org.bukkit.command.Command c, String l, String[] a) { return false; }
}
