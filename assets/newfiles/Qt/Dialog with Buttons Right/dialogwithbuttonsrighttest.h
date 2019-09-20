#ifndef DIALOGWITHBUTTONSRIGHTTEST_H
#define DIALOGWITHBUTTONSRIGHTTEST_H

#include <QDialog>

namespace Ui {
class DialogWithButtonsRightTest;
}

class DialogWithButtonsRightTest : public QDialog
{
    Q_OBJECT

public:
    explicit DialogWithButtonsRightTest(QWidget *parent = nullptr);
    ~DialogWithButtonsRightTest();

private:
    Ui::DialogWithButtonsRightTest *ui;
};

#endif // DIALOGWITHBUTTONSRIGHTTEST_H
