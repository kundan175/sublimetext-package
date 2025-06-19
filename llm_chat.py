import sublime
import sublime_plugin
import subprocess
import json
import os
import threading

class LlmChatCommand(sublime_plugin.TextCommand):
    def run(self, edit):
        # Show input panel for user query
        self.view.window().show_input_panel(
            "Ask LLM:", 
            "", 
            self.on_query_entered, 
            None, 
            None
        )
    
    def on_query_entered(self, query):
        if not query.strip():
            return
        
        # Get selected text as context if any
        selected_text = ""
        for region in self.view.sel():
            if not region.empty():
                selected_text = self.view.substr(region)
                break
        
        # Run the chat in a separate thread to avoid blocking UI
        threading.Thread(
            target=self.run_llm_chat, 
            args=(query, selected_text)
        ).start()
    
    def run_llm_chat(self, query, context):
        try:
            # Get the package directory
            package_path = os.path.dirname(__file__)
            script_path = os.path.join(package_path, "llm_chat.js")
            
            # Prepare the input data
            input_data = {
                "query": query,
                "context": context,
                "file_path": self.view.file_name() or "",
                "file_syntax": self.view.settings().get('syntax', '').split('/')[-1].replace('.sublime-syntax', '')
            }
            
            # Run the Node.js script
            result = subprocess.run(
                ["node", script_path], 
                input=json.dumps(input_data),
                capture_output=True, 
                text=True,
                cwd=package_path
            )
            
            if result.returncode == 0:
                response_data = json.loads(result.stdout)
                sublime.set_timeout(
                    lambda: self.show_response(response_data), 
                    0
                )
            else:
                sublime.set_timeout(
                    lambda: sublime.error_message(f"LLM Chat Error: {result.stderr}"), 
                    0
                )
                
        except Exception as e:
            sublime.set_timeout(
                lambda: sublime.error_message(f"Error running LLM chat: {str(e)}"), 
                0
            )
    
    def show_response(self, response_data):
        # Create a new view to show the response
        window = self.view.window()
        response_view = window.new_file()
        response_view.set_name("LLM Response")
        response_view.set_syntax_file("Packages/Markdown/Markdown.sublime-syntax")
        
        # Insert the response
        response_view.run_command("insert", {
            "characters": f"# LLM Response\n\n**Query:** {response_data.get('query', '')}\n\n**Response:**\n\n{response_data.get('response', '')}\n\n---\n\n*Generated at {response_data.get('timestamp', '')}*"
        })
        
        # Make it read-only
        response_view.set_read_only(True)

class LlmExplainCodeCommand(sublime_plugin.TextCommand):
    def run(self, edit):
        # Get selected text
        selected_text = ""
        for region in self.view.sel():
            if not region.empty():
                selected_text = self.view.substr(region)
                break
        
        if not selected_text:
            sublime.error_message("Please select some code to explain")
            return
        
        # Run explanation
        threading.Thread(
            target=self.explain_code, 
            args=(selected_text,)
        ).start()
    
    def explain_code(self, code):
        try:
            package_path = os.path.dirname(__file__)
            script_path = os.path.join(package_path, "llm_chat.js")
            
            input_data = {
                "query": f"Please explain this code:\n\n```\n{code}\n```",
                "context": "",
                "file_path": self.view.file_name() or "",
                "file_syntax": self.view.settings().get('syntax', '').split('/')[-1].replace('.sublime-syntax', '')
            }
            
            result = subprocess.run(
                ["node", script_path], 
                input=json.dumps(input_data),
                capture_output=True, 
                text=True,
                cwd=os.path.dirname(__file__)
            )
            
            if result.returncode == 0:
                response_data = json.loads(result.stdout)
                sublime.set_timeout(
                    lambda: self.show_explanation(response_data), 
                    0
                )
            else:
                sublime.set_timeout(
                    lambda: sublime.error_message(f"Error: {result.stderr}"), 
                    0
                )
                
        except Exception as e:
            sublime.set_timeout(
                lambda: sublime.error_message(f"Error: {str(e)}"), 
                0
            )
    
    def show_explanation(self, response_data):
        window = self.view.window()
        response_view = window.new_file()
        response_view.set_name("Code Explanation")
        response_view.set_syntax_file("Packages/Markdown/Markdown.sublime-syntax")
        
        response_view.run_command("insert", {
            "characters": f"# Code Explanation\n\n{response_data.get('response', '')}\n\n---\n\n*Generated at {response_data.get('timestamp', '')}*"
        })
        
        response_view.set_read_only(True)
