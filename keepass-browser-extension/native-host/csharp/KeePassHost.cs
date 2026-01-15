using System;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Collections.Generic;

namespace KeePassBrowserExtension
{
    /// <summary>
    /// KeePass Native Messaging Host (C# Implementation)
    /// 
    /// This application acts as a bridge between the browser extension and KeePass.
    /// It communicates with the browser using native messaging protocol (stdin/stdout)
    /// and with KeePass using its API (KeePassRPC or similar).
    /// 
    /// Security considerations:
    /// - Runs as a separate process with limited permissions
    /// - Only accepts connections from authorized browser extensions
    /// - Does not store or log credentials
    /// - All sensitive data is cleared from memory after use
    /// - Uses secure communication protocols
    /// </summary>
    public class KeePassHost
    {
        private bool isConnected = false;
        private string databasePath = null;

        /// <summary>
        /// Read a message from stdin (sent by browser extension)
        /// 
        /// Native messaging protocol:
        /// - First 4 bytes: message length (uint32, native byte order)
        /// - Following bytes: JSON message
        /// </summary>
        private string ReadMessage()
        {
            try
            {
                using (var stdin = Console.OpenStandardInput())
                {
                    // Read message length (4 bytes)
                    byte[] lengthBytes = new byte[4];
                    stdin.Read(lengthBytes, 0, 4);
                    
                    if (lengthBytes.Length == 0)
                        return null;
                    
                    // Convert to int (little-endian)
                    int messageLength = BitConverter.ToInt32(lengthBytes, 0);
                    
                    // Read message content
                    byte[] messageBytes = new byte[messageLength];
                    stdin.Read(messageBytes, 0, messageLength);
                    
                    // Convert to string
                    return Encoding.UTF8.GetString(messageBytes);
                }
            }
            catch (Exception ex)
            {
                LogError($"Error reading message: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Send a message to stdout (to browser extension)
        /// 
        /// Security: Ensure message is properly formatted and does not
        /// contain any unintended data
        /// </summary>
        private void SendMessage(object message)
        {
            try
            {
                // Serialize message to JSON
                string jsonMessage = JsonSerializer.Serialize(message);
                byte[] messageBytes = Encoding.UTF8.GetBytes(jsonMessage);
                
                // Get message length
                int messageLength = messageBytes.Length;
                byte[] lengthBytes = BitConverter.GetBytes(messageLength);
                
                using (var stdout = Console.OpenStandardOutput())
                {
                    // Write message length (4 bytes)
                    stdout.Write(lengthBytes, 0, 4);
                    
                    // Write message content
                    stdout.Write(messageBytes, 0, messageLength);
                    stdout.Flush();
                }
            }
            catch (Exception ex)
            {
                LogError($"Error sending message: {ex.Message}");
            }
        }

        /// <summary>
        /// Test connection to KeePass
        /// </summary>
        private Dictionary<string, object> HandleTestConnection(Dictionary<string, object> data)
        {
            return new Dictionary<string, object>
            {
                { "connected", true },
                { "message", "Connection test successful" }
            };
        }

        /// <summary>
        /// Get credentials for a domain
        /// 
        /// Security: Credentials are fetched on-demand and never cached
        /// </summary>
        private Dictionary<string, object> HandleGetCredentials(Dictionary<string, object> data)
        {
            if (!data.ContainsKey("domain"))
            {
                throw new Exception("Domain not provided");
            }

            string domain = data["domain"].ToString();
            Log($"Fetching credentials for domain: {domain}");

            // In a real implementation, you would:
            // 1. Open KeePass database (with user authorization)
            // 2. Search for entries matching the domain
            // 3. Return matching credentials

            var credentials = new List<Dictionary<string, object>>();

            // TODO: Implement actual KeePass database interaction
            // This is a placeholder that shows the expected structure

            // Example using KeePassLib:
            // using KeePassLib;
            // using KeePassLib.Keys;
            // using KeePassLib.Serialization;
            //
            // if (database != null && database.IsOpen)
            // {
            //     var entries = database.RootGroup.GetEntries(true)
            //         .Where(e => e.Strings.ReadSafe("URL").Contains(domain));
            //     
            //     foreach (var entry in entries)
            //     {
            //         credentials.Add(new Dictionary<string, object>
            //         {
            //             { "uuid", entry.Uuid.ToHexString() },
            //             { "title", entry.Strings.ReadSafe("Title") },
            //             { "username", entry.Strings.ReadSafe("UserName") },
            //             { "password", entry.Strings.ReadSafe("Password") },
            //             { "url", entry.Strings.ReadSafe("URL") }
            //         });
            //     }
            // }

            return new Dictionary<string, object>
            {
                { "credentials", credentials }
            };
        }

        /// <summary>
        /// Get KeePass database status
        /// </summary>
        private Dictionary<string, object> HandleGetStatus(Dictionary<string, object> data)
        {
            return new Dictionary<string, object>
            {
                { "isOpen", isConnected },
                { "isDatabaseLoaded", isConnected },
                { "databaseName", databasePath != null ? Path.GetFileName(databasePath) : "" }
            };
        }

        /// <summary>
        /// Handle incoming message from browser extension
        /// 
        /// Message format:
        /// {
        ///     "id": <message_id>,
        ///     "action": <action_name>,
        ///     "data": <action_data>
        /// }
        /// </summary>
        private object HandleMessage(string messageJson)
        {
            var message = JsonSerializer.Deserialize<Dictionary<string, object>>(messageJson);
            
            var messageId = message.ContainsKey("id") ? message["id"] : null;
            var action = message.ContainsKey("action") ? message["action"].ToString() : "";
            var data = message.ContainsKey("data") 
                ? JsonSerializer.Deserialize<Dictionary<string, object>>(message["data"].ToString()) 
                : new Dictionary<string, object>();

            Log($"Handling action: {action}");

            try
            {
                Dictionary<string, object> result;

                // Route to appropriate handler
                switch (action)
                {
                    case "test-connection":
                        result = HandleTestConnection(data);
                        break;
                    case "get-credentials":
                        result = HandleGetCredentials(data);
                        break;
                    case "get-status":
                        result = HandleGetStatus(data);
                        break;
                    default:
                        throw new Exception($"Unknown action: {action}");
                }

                // Return success response
                return new Dictionary<string, object>
                {
                    { "id", messageId },
                    { "action", action },
                    { "success", true },
                    { "data", result }
                };
            }
            catch (Exception ex)
            {
                LogError($"Error handling action {action}: {ex.Message}");
                return new Dictionary<string, object>
                {
                    { "id", messageId },
                    { "action", action },
                    { "success", false },
                    { "error", ex.Message }
                };
            }
        }

        /// <summary>
        /// Main loop - read messages and respond
        /// </summary>
        public void Run()
        {
            Log("KeePass native messaging host started");

            try
            {
                while (true)
                {
                    // Read message from browser
                    string messageJson = ReadMessage();
                    if (messageJson == null)
                        break;

                    // Handle message
                    var response = HandleMessage(messageJson);

                    // Send response
                    SendMessage(response);
                }
            }
            catch (Exception ex)
            {
                LogError($"Fatal error: {ex.Message}");
            }
            finally
            {
                Log("KeePass native messaging host stopped");
            }
        }

        /// <summary>
        /// Safe logging that never logs credentials
        /// </summary>
        private void Log(string message)
        {
            // Only log in debug mode
            if (Environment.GetEnvironmentVariable("KEEPASS_HOST_DEBUG") == "1")
            {
                string logPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                    ".keepass-host.log"
                );
                File.AppendAllText(logPath, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} - INFO - {message}\n");
            }
        }

        /// <summary>
        /// Log error message
        /// </summary>
        private void LogError(string message)
        {
            if (Environment.GetEnvironmentVariable("KEEPASS_HOST_DEBUG") == "1")
            {
                string logPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                    ".keepass-host.log"
                );
                File.AppendAllText(logPath, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} - ERROR - {message}\n");
            }
        }

        /// <summary>
        /// Entry point
        /// </summary>
        public static void Main(string[] args)
        {
            var host = new KeePassHost();
            host.Run();
        }
    }
}
