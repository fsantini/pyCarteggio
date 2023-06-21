import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QTextEdit, QLineEdit, QLabel, QMessageBox, QHBoxLayout, \
    QSizePolicy
import re


def sanitize_input(expression):
    # Remove any characters that are not numbers, operators, or spaces
    sanitized_expression = re.sub(r'[^0-9+\-*/.\s]', '', expression)
    return sanitized_expression


class ScratchpadWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Note")
        self.resize(400, 300)

        layout = QVBoxLayout()
        self.setLayout(layout)

        self.top_widget = QWidget()
        top_layout = QHBoxLayout()
        self.top_widget.setLayout(top_layout)

        # Create the label for the expression input
        label = QLabel("Calc:")
        label.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Minimum)
        top_layout.addWidget(label)

        # Create the expression input box and result display box
        self.expression_input = QLineEdit()
        self.expression_input.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Minimum)
        self.expression_input.returnPressed.connect(self.evaluate_expression)
        top_layout.addWidget(self.expression_input)

        self.result_display = QLineEdit()
        self.result_display.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Minimum)
        self.result_display.setReadOnly(True)
        self.result_display.setStyleSheet("background-color: #ddffdd;")
        self.result_display.setFixedWidth(50)
        top_layout.addWidget(self.result_display)

        layout.addWidget(self.top_widget)
        label2 = QLabel("Note:")
        label2.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Minimum)
        layout.addWidget(label2)

        # Create the text area
        self.text_area = QTextEdit()
        layout.addWidget(self.text_area)

    def evaluate_expression(self):
        expression = self.expression_input.text()
        sanitized_expression = sanitize_input(expression)

        if sanitized_expression == "":
            QMessageBox.critical(self, "Invalid Expression", "Espressione non valida")
            return

        try:
            result = eval(sanitized_expression)
            self.result_display.setText(str(round(result,1)))
        except Exception as e:
            self.result_display.setText("Error: " + str(e))

    def closeEvent(self, event):
        self.hide()


if __name__ == '__main__':
    app = QApplication(sys.argv)
    main_window = ScratchpadWindow()
    sys.exit(app.exec_())