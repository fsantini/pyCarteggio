# This is a sample Python script.
import math

from matplotlib.lines import Line2D

# Press Shift+F10 to execute it or replace it with your code.
# Press Double Shift to search everywhere for classes, files, tool windows, actions, and settings.

CHART_FILE = 'Carta Nautica 5D_200dpi.png'
IMAGE_EXTENT = None

import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import sys
from PyQt5.QtWidgets import QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, \
    QSpacerItem, QSizePolicy, QComboBox
from PyQt5.QtCore import Qt, pyqtSignal, pyqtSlot
from PyQt5.QtGui import QIcon
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.backends.backend_qt5agg import NavigationToolbar2QT as NavigationToolbar
from matplotlib.figure import Figure
from matplotlib.colors import to_rgb, to_hex

from matplotlib.patches import Circle

from dataclasses import dataclass

color_list = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black']

regions = {
    'Giglio e Argentario': ((4216, 6318), (4132, 2901)),
    'Talamone e Formiche G': ((4461, 5887), (2878, 1693)),
    'Montecristo e Sc. Africa': ((520, 2225), (4132, 3488)),
    'Follonica e Sparviero': ((3476, 5037), (1554, 274)),
    'Elba': ((775, 2778), (1694, 478)),
    'Piombino': ((2110, 3493), (899, 0)),
    'Pianosa': ((479, 1214), (2679, 1911)),
    'Marina di Grosseto': ((4383, 5697), (2196, 1186))
}

def coord_to_float(deg, primes):
    return deg + float(primes)/60

def float_to_coord(float_coord):
    deg = int(float_coord)
    primes = (float_coord - deg)*60
    return deg, primes


@dataclass
class CoordElement:
    deg: int
    primes: float

    def to_float(self):
        return coord_to_float(self.deg, self.primes)

    def __add__(self, other):
        return CoordElement.from_float(self.to_float() + other.to_float())

    def __repr__(self):
        primes = round(self.primes,1)
        deg = self.deg
        if primes >= 60:
            primes -= 60
            deg += 1
        return f"{deg}°{primes:04.1f}'"

    @classmethod
    def from_float(cls, float_coord):
        return cls(*float_to_coord(float_coord))

@dataclass
class Coord:
    latitude: CoordElement
    longitude: CoordElement

START_COORD = Coord(CoordElement(42,20.0), CoordElement(10, 0.0))
PIXEL_PER_PRIME_LAT = 106
PIXEL_PER_PRIME_LONG = 77.25

START_PX = (472, 3979)

def coord_to_px(coord: Coord):
    return START_PX[0] + coord.latitude.to_float() * 60 * PIXEL_PER_PRIME_LONG, \
        START_PX[1] - coord.longitude.to_float() * 60 * PIXEL_PER_PRIME_LAT

def px_to_coord(pixel_location):
    return Coord(
        START_COORD.latitude + CoordElement.from_float(float(START_PX[1] - pixel_location[1]) / 60 / PIXEL_PER_PRIME_LAT),
        START_COORD.longitude + CoordElement.from_float(float(pixel_location[0] - START_PX[0]) / 60 / PIXEL_PER_PRIME_LONG )
    )

class DotPainter:
    def __init__(self, ax, x=0, y=0, color='red', radius=5):
        self.ax = ax
        self.x = x
        self.y = y
        self.color = color
        self.radius = radius
        self.dot = Circle((self.x, self.y), radius=self.radius, color=self.color, fc=self.color)
        self.ax.add_patch(self.dot)
        self.click_left = self.set_coordinates
        self.click_right = self.set_coordinates

    def remove(self):
        try:
            self.dot.remove()
            self.ax.figure.canvas.draw()
        except:
            pass

    def paint(self):
        self.dot.center = (self.x, self.y)
        self.dot.set(color=self.color, facecolor=self.color)
        self.ax.figure.canvas.draw()

    def set_coordinates(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        coord = px_to_coord((self.x,self.y))
        return f'P: {str(coord.latitude)} N, {str(coord.longitude)} E'


class CirclePainter:
    def __init__(self, ax, x=0, y=0, radius=1, color='red', linewidth=1):
        self.ax = ax
        self.x = x
        self.y = y
        self.color = color
        self.radius = radius
        self.circle = Circle((self.x, self.y), radius=self.radius, color=self.color, linewidth=linewidth, fill=False)
        self.ax.add_patch(self.circle)
        self.click_left = self.set_coordinates
        self.click_right = self.set_radius_from_point

    def remove(self):
        try:
            self.circle.remove()
            self.ax.figure.canvas.draw()
        except:
            pass

    def paint(self):
        self.circle.center = (self.x, self.y)
        self.circle.radius = self.radius
        self.circle.set(color=self.color)
        self.ax.figure.canvas.draw()

    def set_coordinates(self, x, y):
        self.x = x
        self.y = y

    def set_radius(self, radius):
        if radius == 0: return
        self.radius = radius

    def set_radius_from_point(self, x, y):
        radius = math.sqrt((y-self.y)**2 + (x-self.x)**2)
        self.set_radius(radius)

    # return radius as representation
    def __repr__(self):
        return f'C: {round(float(self.radius) / PIXEL_PER_PRIME_LAT, 1)}'


class LinePainter:
    def __init__(self, ax, x1=0, y1=0, x2=1, y2=1, color='red', linewidth=1):
        self.ax = ax
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
        self.color = color
        self.linewidth = linewidth
        self.line = Line2D([self.x1, self.x2], [self.y1, self.y2], color=self.color, linewidth=self.linewidth)
        self.ax.add_line(self.line)
        self.point_one_set = False
        self.point_two_set = False

    def paint(self):
        if not (self.point_one_set and self.point_two_set): return
        x_left, x_right = IMAGE_EXTENT[0], IMAGE_EXTENT[1]
        y_bottom, y_top = IMAGE_EXTENT[2], IMAGE_EXTENT[3]

        dx = self.x2 - self.x1
        dy = self.y2 - self.y1

        if dx == 0:
            x_vals = [self.x1] * 2
            y_vals = [y_bottom, y_top]
        else:
            slope = dy / dx
            x_vals = [x_left, x_right]
            y_vals = [self.y1 + slope * (x_left - self.x1), self.y1 + slope * (x_right - self.x1)]

        self.line.set_data(x_vals, y_vals)
        self.line.set(color=self.color)
        self.ax.figure.canvas.draw()

    def remove(self):
        try:
            self.line.remove()
            self.ax.figure.canvas.draw()
        except:
            pass

    def set_points(self, x1, y1, x2, y2):
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2

    def click_left(self,x,y):
        self.point_one_set = True
        self.x1 = x
        self.y1 = y

    def click_right(self,x,y):
        self.point_two_set = True
        self.x2 = x
        self.y2 = y

    # return angle as representation
    def __repr__(self):
        angle1 = round(math.degrees(math.atan2(self.y2 - self.y1, self.x2 - self.x1)) - 90) % 360
        angle2 = (angle1 + 180) % 360
        return f'L: {min(angle1, angle2)}°, {max(angle1, angle2)}°'

def luminance(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


class GraphicListItem(QWidget):

    edit_signal = pyqtSignal(QWidget, object)

    def __init__(self, parent, text, color, graphic_item):
        super().__init__(parent)
        self.graphic_item = graphic_item

        # Create the main widget and set the layout
        main_layout = QHBoxLayout(self)
        main_layout.setContentsMargins(0,0,0,0)
        main_layout.setSpacing(0)
        self.label = QLabel(self)
        self.label_border_color = to_hex(color)
        if luminance(to_rgb(color)) > 0.5:
            self.label_style = f'color: {to_hex(color)}; background-color: #696969; '
        else:
            self.label_style = f'color: {to_hex(color)}; '
        self.label.setText(text)
        self.label.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Minimum)
        main_layout.addWidget(self.label)
        self.edit_button = QPushButton('Edit', self)
        self.edit_button.clicked.connect(lambda : self.edit_signal.emit(self, self.graphic_item))
        self.edit_button.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Minimum)
        main_layout.addWidget(self.edit_button)
        self.del_button = QPushButton('Del', self)
        self.del_button.clicked.connect(self.delete)
        self.del_button.setSizePolicy(QSizePolicy.Minimum, QSizePolicy.Minimum)
        main_layout.addWidget(self.del_button)
        main_layout.setStretch(0, 1)
        main_layout.setStretch(1, 0)
        main_layout.setStretch(2, 0)
        self.get_focus()

    def delete(self):
        self.graphic_item.remove()
        self.hide()

    def setText(self, text):
        self.label.setText(text)

    def get_focus(self):
        self.label.setStyleSheet(self.label_style + f'border: 3px ridge {self.label_border_color};')
        print('Got focus')

    def lost_focus(self):
        self.label.setStyleSheet(self.label_style + 'border: 0px;')
        print('Lost focus')

class MyWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PyCarteggio")
        self.initUI()

        self.current_tool = None
        self.current_label = None
        self.current_color_index = 0

    def initUI(self):
        global IMAGE_EXTENT
        # Create the main widget and set the layout
        main_widget = QWidget(self)
        main_layout = QHBoxLayout(main_widget)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(10)

        mpl_widget = QWidget(self)
        mpl_layout = QVBoxLayout(mpl_widget)

        # Create the matplotlib axis
        fig = Figure()
        fig.set_tight_layout(True)
        self.ax = fig.add_subplot(111)
        #cb_registry = self.ax.callbacks
        #cb_registry.connect('xlim_changed', self.on_lims_change)
        #cb_registry.connect('ylim_changed', self.on_lims_change)


        canvas = FigureCanvas(fig)
        canvas.mpl_connect('button_press_event', self.on_canvas_click)  # Connect the mouse click even

        class MyNavToolbar(NavigationToolbar):
            def __init__(self, canvas, mpl_widget, custom_home_action):
                super().__init__(canvas, mpl_widget)
                self.home_action = custom_home_action

            def home(self, *args):
                self.home_action()
                self._update_view()

        self.mpl_toolbar = MyNavToolbar(canvas, mpl_widget, lambda: self.change_region('Generale'))
        mpl_layout.addWidget(self.mpl_toolbar)
        mpl_layout.addWidget(canvas)

        main_layout.addWidget(mpl_widget)

        img = mpimg.imread(CHART_FILE)
        imgplot = self.ax.imshow(img)
        print(imgplot.get_extent())
        IMAGE_EXTENT = imgplot.get_extent()
        self.ax.axis('off')

        # Create the QWidget
        right_widget = QWidget(self)
        right_widget.setMinimumWidth(300)
        right_layout = QVBoxLayout(right_widget)
        self.element_list_widget = QWidget(right_widget)
        self.element_list_layout = QVBoxLayout(self.element_list_widget)
        self.toolbox_widget = QWidget(right_widget)
        self.toolbox_layout = QHBoxLayout(self.toolbox_widget)
        self.point_add_button = QPushButton('Coordinata', self.toolbox_widget)
        self.point_add_button.clicked.connect(self.add_point)
        self.toolbox_layout.addWidget(self.point_add_button)
        self.line_add_button = QPushButton('Linea', self.toolbox_widget)
        self.line_add_button.clicked.connect(self.add_line)
        self.toolbox_layout.addWidget(self.line_add_button)
        self.circle_add_button = QPushButton('Cerchio', self.toolbox_widget)
        self.circle_add_button.clicked.connect(self.add_circle)
        self.toolbox_layout.addWidget(self.circle_add_button)
        right_layout.addWidget(self.element_list_widget)
        vertical_spacer = QSpacerItem(20, 40, QSizePolicy.Minimum, QSizePolicy.Expanding)
        right_layout.addItem(vertical_spacer)
        right_layout.addWidget(self.toolbox_widget)
        self.regions_combo = QComboBox(right_widget)
        self.regions_combo.setEditable(False)
        self.regions_combo.addItem('Generale')
        for region_name in regions.keys():
            self.regions_combo.addItem(region_name)
        self.regions_combo.currentTextChanged.connect(self.change_region)
        right_layout.addWidget(self.regions_combo)
        main_layout.addWidget(right_widget)
        main_layout.setStretch(0, 1)
        main_layout.setStretch(1, 0)

        # Set the main widget
        self.setCentralWidget(main_widget)

        # Show the window
        self.show()

    def change_region(self, region_name):
        if region_name == 'Generale':
            self.regions_combo.setCurrentIndex(0)
            self.ax.set_xlim(IMAGE_EXTENT[0:2])
            self.ax.set_ylim(IMAGE_EXTENT[2:4])
        else:
            self.ax.set_xlim(regions[region_name][0])
            self.ax.set_ylim(regions[region_name][1])
        self.ax.figure.canvas.draw()

    def on_lims_change(self, event_ax):
        xl = (round(self.ax.get_xlim()[0]), round(self.ax.get_xlim()[1]))
        yl = (round(self.ax.get_ylim()[0]), round(self.ax.get_ylim()[1]))
        print(f'({xl}, {yl})')

    def increase_color_index(self):
        self.current_color_index = (self.current_color_index + 1) % len(color_list)

    def add_object(self, text, GraphicClass):
        if self.current_label is not None:
            self.current_label.lost_focus()
        self.current_tool = GraphicClass(self.ax, color=color_list[self.current_color_index])
        self.current_label = GraphicListItem(self, text, color_list[self.current_color_index], self.current_tool)
        self.current_label.edit_signal.connect(self.change_edit)
        self.increase_color_index()
        self.element_list_layout.addWidget(self.current_label)

    def add_point(self):
        self.add_object('Nuovo punto', DotPainter)

    def add_line(self):
        self.add_object('Nuova linea', LinePainter)

    def add_circle(self):
        self.add_object('Nuovo cerchio', CirclePainter)

    @pyqtSlot(QWidget, object)
    def change_edit(self, label, graphic_item):
        if self.current_label is not None:
            self.current_label.lost_focus()
        self.current_tool = graphic_item
        self.current_label = label
        self.current_label.get_focus()

    def on_canvas_click(self, event):
        # if we are zooming or panning, do nothing
        if self.mpl_toolbar.mode:
            return
        if event.button == 1:  # Left mouse button
            #print(f"Left click at ({event.xdata}, {event.ydata})")
            #print(px_to_coord((event.xdata, event.ydata)))
            if self.current_tool:
                self.current_tool.click_left(event.xdata, event.ydata)
                self.current_tool.paint()
                if self.current_label:
                    self.current_label.setText(str(self.current_tool))
        elif event.button == 3:  # Right mouse button
            #print(f"Right click at ({event.xdata}, {event.ydata})")
            if self.current_tool:
                self.current_tool.click_right(event.xdata, event.ydata)
                self.current_tool.paint()
                if self.current_label:
                    self.current_label.setText(str(self.current_tool))

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MyWindow()
    sys.exit(app.exec_())

