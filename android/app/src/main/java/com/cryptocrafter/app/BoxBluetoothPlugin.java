package com.cryptocrafter.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "BoxBluetooth",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class BoxBluetoothPlugin extends Plugin {
    private static final String BOX_NAME = "CryptoCrafter_Box";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private BluetoothSocket socket;
    private OutputStream outputStream;
    private PluginCall pendingConnectCall;
    private String lastDetail = "Not connected.";

    @PluginMethod
    public void connect(PluginCall call) {
        if (!hasRuntimePermissions()) {
            pendingConnectCall = call;
            requestPermissionForAliases(new String[] { "bluetooth", "location" }, call, "connectPermissionResult");
            return;
        }

        connectWithPermissions(call);
    }

    @PermissionCallback
    private void connectPermissionResult(PluginCall call) {
        PluginCall activeCall = pendingConnectCall != null ? pendingConnectCall : call;
        pendingConnectCall = null;

        if (!hasRuntimePermissions()) {
            activeCall.reject("Bluetooth permission was not granted.");
            return;
        }

        connectWithPermissions(activeCall);
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closeSocket();
        lastDetail = "Disconnected.";
        JSObject result = new JSObject();
        result.put("connected", false);
        result.put("detail", lastDetail);
        call.resolve(result);
    }

    @PluginMethod
    public void sendCommand(PluginCall call) {
        String command = call.getString("command", "");
        if (command.trim().isEmpty()) {
            call.reject("Missing command.");
            return;
        }

        executor.execute(() -> {
            synchronized (this) {
                if (outputStream == null || socket == null || !socket.isConnected()) {
                    call.reject("Prize Chest is not connected.");
                    return;
                }

                try {
                    outputStream.write((command.trim() + "\n").getBytes());
                    outputStream.flush();
                    lastDetail = "Sent: " + command.trim();
                    JSObject result = new JSObject();
                    result.put("connected", true);
                    result.put("detail", lastDetail);
                    call.resolve(result);
                } catch (IOException error) {
                    closeSocket();
                    lastDetail = "Send failed: " + error.getMessage();
                    call.reject(lastDetail);
                }
            }
        });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", socket != null && socket.isConnected());
        result.put("detail", lastDetail);
        result.put("deviceName", BOX_NAME);
        call.resolve(result);
    }

    private void connectWithPermissions(PluginCall call) {
        executor.execute(() -> {
            BluetoothAdapter adapter = getBluetoothAdapter();
            if (adapter == null) {
                call.reject("This Android device does not have Bluetooth.");
                return;
            }

            if (!adapter.isEnabled()) {
                call.reject("Bluetooth is turned off. Turn it on, then try again.");
                return;
            }

            BluetoothDevice boxDevice = findBondedBox(adapter);
            if (boxDevice == null) {
                call.reject("Pair with CryptoCrafter_Box in Android Bluetooth settings first.");
                return;
            }

            try {
                closeSocket();
                BluetoothSocket nextSocket = boxDevice.createRfcommSocketToServiceRecord(SPP_UUID);
                adapter.cancelDiscovery();
                nextSocket.connect();

                synchronized (this) {
                    socket = nextSocket;
                    outputStream = nextSocket.getOutputStream();
                    lastDetail = "Connected to " + boxDevice.getName() + ".";
                }

                JSObject result = new JSObject();
                result.put("connected", true);
                result.put("detail", lastDetail);
                result.put("deviceName", boxDevice.getName());
                call.resolve(result);
            } catch (IOException error) {
                closeSocket();
                lastDetail = "Connection failed: " + error.getMessage();
                call.reject(lastDetail);
            }
        });
    }

    private BluetoothAdapter getBluetoothAdapter() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return manager != null ? manager.getAdapter() : BluetoothAdapter.getDefaultAdapter();
    }

    private BluetoothDevice findBondedBox(BluetoothAdapter adapter) {
        Set<BluetoothDevice> bondedDevices = adapter.getBondedDevices();
        for (BluetoothDevice device : bondedDevices) {
            if (BOX_NAME.equals(device.getName())) {
                return device;
            }
        }

        return null;
    }

    private boolean hasRuntimePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getPermissionState("bluetooth") == PermissionState.GRANTED;
        }

        return getPermissionState("location") == PermissionState.GRANTED;
    }

    private synchronized void closeSocket() {
        try {
            if (outputStream != null) {
                outputStream.close();
            }
        } catch (IOException ignored) {
        }

        try {
            if (socket != null) {
                socket.close();
            }
        } catch (IOException ignored) {
        }

        outputStream = null;
        socket = null;
    }
}
